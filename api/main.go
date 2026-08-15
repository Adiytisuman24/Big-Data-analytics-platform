package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

const druidURL = "http://localhost:18082/druid/v2/sql" // using the broker port (we'll assume the Go API runs locally, not in docker for now)

type DruidQuery struct {
	Query string `json:"query"`
}

func executeDruidQuery(sql string) ([]byte, error) {
	q := DruidQuery{Query: sql}
	payload, err := json.Marshal(q)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", druidURL, bytes.NewBuffer(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("druid error: %s", string(body))
	}
	return body, nil
}

func getTraffic(w http.ResponseWriter, r *http.Request) {
	// requests per minute over the last hour
	sql := `
		SELECT 
			TIME_FLOOR(__time, 'PT1M') as time_bucket,
			SUM("count") as requests
		FROM agent_execution_events
		WHERE __time >= CURRENT_TIMESTAMP - INTERVAL '1' HOUR
		GROUP BY 1
		ORDER BY 1 DESC
	`
	res, err := executeDruidQuery(sql)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(res)
}

func getErrors(w http.ResponseWriter, r *http.Request) {
	sql := `
		SELECT 
			status,
			SUM("count") as error_count
		FROM agent_execution_events
		WHERE status != 'success'
		GROUP BY 1
	`
	res, err := executeDruidQuery(sql)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(res)
}

func getLatency(w http.ResponseWriter, r *http.Request) {
	sql := `
		SELECT 
			model,
			AVG(total_latency_ms) as avg_latency_ms
		FROM agent_execution_events
		GROUP BY 1
	`
	res, err := executeDruidQuery(sql)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(res)
}

func getModelStats(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	model := vars["model"]

	sql := fmt.Sprintf(`
		SELECT 
			tool,
			SUM("count") as usage_count,
			SUM(total_input_tokens) as total_input_tokens,
			SUM(total_output_tokens) as total_output_tokens
		FROM agent_execution_events
		WHERE model = '%s'
		GROUP BY 1
	`, model)
	res, err := executeDruidQuery(sql)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(res)
}

func getAgentStats(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	agentID := vars["agent_id"]

	sql := fmt.Sprintf(`
		SELECT 
			model,
			status,
			SUM("count") as usage_count
		FROM agent_execution_events
		WHERE agent_id = '%s'
		GROUP BY 1, 2
	`, agentID)
	res, err := executeDruidQuery(sql)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(res)
}

func main() {
	r := mux.NewRouter()

	r.HandleFunc("/analytics/traffic", getTraffic).Methods("GET")
	r.HandleFunc("/analytics/errors", getErrors).Methods("GET")
	r.HandleFunc("/analytics/latency", getLatency).Methods("GET")
	r.HandleFunc("/analytics/models/{model}", getModelStats).Methods("GET")
	r.HandleFunc("/analytics/agents/{agent_id}", getAgentStats).Methods("GET")

	port := ":8080"
	fmt.Printf("Analytics API running on port %s\n", port)
	log.Fatal(http.ListenAndServe(port, r))
}
