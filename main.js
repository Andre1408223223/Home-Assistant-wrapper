let ws;

function connectToHomeAssistant(url, token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${url}/api/websocket`);

    ws.onmessage = (event) => {
      const { type, message } = JSON.parse(event.data);

      switch (type) {
        case "auth_required":
          ws.send(JSON.stringify({ type: "auth", access_token: token }));
          break;
        case "auth_ok":
          resolve(ws);
          break;
        case "auth_invalid":
          reject(new Error("Authentication failed: " + message));
          break;
      }
    };

    ws.onerror = reject;
  });
}

function callService(ws, domain, service, entityId, data = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error("WebSocket not connected yet");
    return;
  }

  const serviceData = { entity_id: entityId, ...data };

  ws.send(
    JSON.stringify({
      id: Date.now(),
      type: "call_service",
      domain: domain,
      service: service,
      service_data: serviceData,
    })
  );
}

function live_status(entity, div) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error("WebSocket is not connected yet");
    return;
  }

  const requestId = Math.floor(Math.random() * 1000);

  // Send get_states request to get the initial state
  ws.send(
    JSON.stringify({
      id: requestId,
      type: "get_states",
    })
  );

  // Subscribe to state changes
  ws.send(
    JSON.stringify({
      id: requestId + 1,
      type: "subscribe_events",
      event_type: "state_changed",
    })
  );

  // Single listener for all messages
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    // Handle initial state
    if (
      message.type === "result" &&
      message.id === requestId &&
      message.result
    ) {
      const entityState = message.result.find(
        (state) => state.entity_id === entity
      );
      if (entityState) {
        div.innerHTML = entityState.state;
        div.setAttribute("data-status", entityState.state.toLowerCase());
      }
    }

    // Handle live updates
    if (
      message.type === "event" &&
      message.event.event_type === "state_changed"
    ) {
      const eventData = message.event.data;
      if (eventData.entity_id === entity) {
        div.innerHTML = eventData.new_state.state;
        div.setAttribute(
          "data-status",
          eventData.new_state.state.toLowerCase()
        );
      }
    }
  });
}

function main() {
  connectToHomeAssistant(home_assistant_url, long_lived_access_tokens)
    .then((socket) => {
      ws = socket;
      console.log("Connected to Home Assistant");

      status_divs = document.getElementsByClassName("status");

      for (const div of status_divs) {
        live_status(div.id, div);
      }
    })
    .catch(console.error);
}

main();
