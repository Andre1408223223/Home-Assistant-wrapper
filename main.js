const lampEntityId = "light.table_lamp";
const ws = new WebSocket("ws://100.100.22.66:8123/api/websocket");
let wsId = 1;

ws.onopen = () => {
  console.log("Connected to Home Assistant WebSocket");

  // Authenticate
  ws.send(
    JSON.stringify({
      type: "auth",
      access_token: long_lived_access_tokens,
    })
  );
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  // After auth, request current states and subscribe to state_changed events
  if (msg.type === "auth_ok") {
    console.log("Authenticated! Requesting current states...");

    // 1. Request all states to set initial lamp status
    ws.send(
      JSON.stringify({
        id: wsId++,
        type: "get_states",
      })
    );

    // 2. Subscribe to state_changed events for your lamp
    ws.send(
      JSON.stringify({
        id: wsId++,
        type: "subscribe_events",
        event_type: "state_changed",
      })
    );
  }

  // Handle get_states response to set initial lamp status
  if (msg.type === "result" && Array.isArray(msg.result)) {
    const lampState = msg.result.find((e) => e.entity_id === lampEntityId);
    if (lampState) {
      document.getElementById(
        "status"
      ).innerText = `Status: ${lampState.state}`;
    }
  }

  // Handle state_changed events
  if (msg.type === "event" && msg.event && msg.event.data) {
    const entity = msg.event.data.entity_id;
    if (entity === lampEntityId) {
      const state = msg.event.data.new_state.state;
      document.getElementById("status").innerText = `Status: ${state}`;
    }
  }
};

// Functions to control lamp
function controlLamp(action) {
  ws.send(
    JSON.stringify({
      id: wsId++,
      type: "call_service",
      domain: "light",
      service: action === "on" ? "turn_on" : "turn_off",
      service_data: { entity_id: lampEntityId },
    })
  );
}

document.getElementById("onBtn").onclick = () => controlLamp("on");
document.getElementById("offBtn").onclick = () => controlLamp("off");
