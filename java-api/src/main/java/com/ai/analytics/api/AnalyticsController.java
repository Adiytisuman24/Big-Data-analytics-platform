package com.ai.analytics.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final WebClient druidWebClient;

    @Autowired
    public AnalyticsController(WebClient druidWebClient) {
        this.druidWebClient = druidWebClient;
    }

    private Mono<String> executeDruidQuery(String sql) {
        return druidWebClient.post()
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("query", sql))
                .retrieve()
                .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                        response -> response.bodyToMono(String.class)
                                .map(body -> new RuntimeException("Druid error: " + body)))
                .bodyToMono(String.class)
                .onErrorReturn("[]");
    }

    /**
     * GET /analytics/traffic
     * Returns requests per minute over the last hour.
     */
    @GetMapping("/traffic")
    public Mono<String> getTraffic() {
        String sql = """
                SELECT
                  TIME_FLOOR(__time, 'PT1M') as time_bucket,
                  SUM("count") as requests
                FROM agent_execution_events
                WHERE __time >= CURRENT_TIMESTAMP - INTERVAL '1' HOUR
                GROUP BY 1
                ORDER BY 1 DESC
                """;
        return executeDruidQuery(sql);
    }

    /**
     * GET /analytics/errors
     * Returns error count by status over the last 24 hours.
     */
    @GetMapping("/errors")
    public Mono<String> getErrors() {
        String sql = """
                SELECT
                  status,
                  SUM("count") as error_count
                FROM agent_execution_events
                WHERE status != 'success'
                  AND __time >= CURRENT_TIMESTAMP - INTERVAL '24' HOUR
                GROUP BY 1
                ORDER BY 2 DESC
                """;
        return executeDruidQuery(sql);
    }

    /**
     * GET /analytics/latency
     * Returns average latency per model over the last 24 hours.
     */
    @GetMapping("/latency")
    public Mono<String> getLatency() {
        String sql = """
                SELECT
                  model,
                  AVG(total_latency_ms / NULLIF("count", 0)) as avg_latency_ms,
                  SUM("count") as requests
                FROM agent_execution_events
                WHERE __time >= CURRENT_TIMESTAMP - INTERVAL '24' HOUR
                GROUP BY 1
                ORDER BY 2 DESC
                """;
        return executeDruidQuery(sql);
    }

    /**
     * GET /analytics/models/{model}
     * Returns usage breakdown for a specific model.
     */
    @GetMapping("/models/{model}")
    public Mono<String> getModelStats(@PathVariable String model) {
        String sql = String.format("""
                SELECT
                  tool,
                  status,
                  SUM("count") as usage_count,
                  SUM(total_input_tokens)  as total_input_tokens,
                  SUM(total_output_tokens) as total_output_tokens,
                  AVG(total_latency_ms / NULLIF("count", 0)) as avg_latency_ms
                FROM agent_execution_events
                WHERE model = '%s'
                  AND __time >= CURRENT_TIMESTAMP - INTERVAL '24' HOUR
                GROUP BY 1, 2
                ORDER BY 3 DESC
                """, model.replace("'", "''"));
        return executeDruidQuery(sql);
    }

    /**
     * GET /analytics/agents/{agent_id}
     * Returns usage stats for a specific agent.
     */
    @GetMapping("/agents/{agentId}")
    public Mono<String> getAgentStats(@PathVariable String agentId) {
        String sql = String.format("""
                SELECT
                  model,
                  status,
                  SUM("count") as usage_count,
                  AVG(total_latency_ms / NULLIF("count", 0)) as avg_latency_ms,
                  SUM(total_input_tokens)  as total_input_tokens,
                  SUM(total_output_tokens) as total_output_tokens
                FROM agent_execution_events
                WHERE agent_id = '%s'
                  AND __time >= CURRENT_TIMESTAMP - INTERVAL '24' HOUR
                GROUP BY 1, 2
                """, agentId.replace("'", "''"));
        return executeDruidQuery(sql);
    }

    /**
     * GET /analytics/health
     * Simple health check.
     */
    @GetMapping("/health")
    public Mono<Map<String, String>> health() {
        return Mono.just(Map.of("status", "ok", "service", "java-analytics-api"));
    }
}
