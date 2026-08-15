package com.ai.analytics.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${druid.broker.url}")
    private String druidBrokerUrl;

    @Bean
    public WebClient druidWebClient() {
        return WebClient.builder()
                .baseUrl(druidBrokerUrl)
                .defaultHeader("Content-Type", "application/json")
                .codecs(config -> config.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();
    }
}
