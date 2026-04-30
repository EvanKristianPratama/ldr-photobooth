var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-5Lchtv/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/constants.ts
var MAX_FREE_PARTICIPANTS = 2;
var ROOM_STATES = {
  IDLE: "IDLE",
  SESSION: "SESSION"
};
var EVENTS = {
  ROOM: {
    JOIN: "room:join",
    JOINED: "room:joined",
    READY: "room:ready",
    ERROR: "room:error",
    LEAVE: "room:leave",
    STATE: "room:state"
  },
  SESSION: {
    START: "session:start",
    LAYOUT: "session:layout",
    RESET: "session:reset"
  },
  WEBRTC: {
    OFFER: "webrtc:offer",
    ANSWER: "webrtc:answer",
    CANDIDATE: "webrtc:candidate"
  },
  PHOTO: {
    SEND: "photo:send",
    RECEIVE: "photo:receive",
    META: "photo:meta",
    TRANSFER_COMPLETE: "photo:transfer-complete",
    TRANSFERRED: "photo:transferred"
  },
  LOCATION: {
    UPDATE: "location:update"
  }
};

// src/domain/room.ts
var RoomEngine = class {
  static {
    __name(this, "RoomEngine");
  }
  participants = /* @__PURE__ */ new Map();
  state = ROOM_STATES.IDLE;
  layout = null;
  join(id, displayName) {
    this.participants.set(id, { id, displayName });
  }
  leave(id) {
    this.participants.delete(id);
    if (this.participants.size < 2) {
      this.state = ROOM_STATES.IDLE;
      this.layout = null;
    }
  }
  hasParticipant(id) {
    return this.participants.has(id);
  }
  getParticipantCount() {
    return this.participants.size;
  }
  startSession(layout) {
    if (this.state !== ROOM_STATES.IDLE) return false;
    this.state = ROOM_STATES.SESSION;
    this.layout = layout ?? null;
    return true;
  }
  updateLayout(layout) {
    if (this.state !== ROOM_STATES.IDLE) return false;
    this.layout = layout ?? null;
    return true;
  }
  resetSession() {
    this.state = ROOM_STATES.IDLE;
    this.layout = null;
  }
  getState() {
    return {
      participants: [...this.participants.values()],
      state: this.state,
      layout: this.layout
    };
  }
};

// src/domain/accessPolicy.ts
function canJoinRoom(participantCount, entitlement) {
  if (participantCount >= entitlement.maxParticipants) {
    return {
      allowed: false,
      reason: `Room is full (max ${entitlement.maxParticipants} participants)`
    };
  }
  return { allowed: true };
}
__name(canJoinRoom, "canJoinRoom");

// src/application/roomService.ts
var RoomService = class {
  constructor(roomId, engine, entitlementProvider) {
    this.roomId = roomId;
    this.engine = engine;
    this.entitlementProvider = entitlementProvider;
  }
  static {
    __name(this, "RoomService");
  }
  getEntitlement() {
    return this.entitlementProvider.getEntitlement(this.roomId);
  }
  join(sessionId, displayName) {
    const entitlement = this.getEntitlement();
    if (!this.engine.hasParticipant(sessionId)) {
      const decision = canJoinRoom(this.engine.getParticipantCount(), entitlement);
      if (!decision.allowed) {
        return { ok: false, reason: decision.reason, entitlement };
      }
    }
    this.engine.join(sessionId, displayName);
    return { ok: true, entitlement };
  }
  leave(sessionId) {
    this.engine.leave(sessionId);
  }
  startSession(layout) {
    return this.engine.startSession(layout);
  }
  updateLayout(layout) {
    return this.engine.updateLayout(layout);
  }
  resetSession() {
    this.engine.resetSession();
  }
  getSnapshot() {
    return this.engine.getState();
  }
  getParticipantCount() {
    return this.engine.getParticipantCount();
  }
};

// src/adapters/entitlement/staticEntitlementProvider.ts
var StaticEntitlementProvider = class {
  static {
    __name(this, "StaticEntitlementProvider");
  }
  getEntitlement(_roomId) {
    return {
      vipActive: false,
      maxParticipants: MAX_FREE_PARTICIPANTS
    };
  }
};

// src/adapters/transport/roomDurableObject.ts
var RoomDurableObject = class {
  static {
    __name(this, "RoomDurableObject");
  }
  state;
  env;
  sessions = /* @__PURE__ */ new Map();
  roomService;
  constructor(state, env) {
    this.state = state;
    this.env = env;
    const roomId = state.id.toString();
    const engine = new RoomEngine();
    const entitlementProvider = new StaticEntitlementProvider();
    this.roomService = new RoomService(roomId, engine, entitlementProvider);
  }
  async fetch(request) {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const sessionId = crypto.randomUUID();
    server.accept();
    this.sessions.set(sessionId, { ws: server, displayName: null });
    server.addEventListener("message", async (event) => {
      await this.handleMessage(sessionId, event.data);
    });
    server.addEventListener("close", () => {
      this.handleDisconnect(sessionId);
    });
    server.addEventListener("error", (err) => {
      console.error("WebSocket error:", err);
      this.handleDisconnect(sessionId);
    });
    return new Response(null, { status: 101, webSocket: client });
  }
  async handleMessage(sessionId, raw) {
    try {
      const msg = JSON.parse(raw);
      const { type, payload } = msg;
      switch (type) {
        case EVENTS.ROOM.JOIN:
          this.handleJoin(sessionId, payload);
          break;
        case EVENTS.ROOM.LEAVE:
          this.handleLeave(sessionId);
          break;
        case EVENTS.SESSION.START:
          this.handleSessionStart(payload);
          break;
        case EVENTS.SESSION.LAYOUT:
          this.handleSessionLayout(payload);
          break;
        case EVENTS.SESSION.RESET:
          this.handleSessionReset();
          break;
        case EVENTS.WEBRTC.OFFER:
        case EVENTS.WEBRTC.ANSWER:
        case EVENTS.WEBRTC.CANDIDATE:
          this.handleWebRTC(sessionId, type, payload);
          break;
        case EVENTS.PHOTO.SEND:
          this.handlePhotoSend(sessionId, payload);
          break;
        case EVENTS.PHOTO.META:
          this.handlePhotoMeta(sessionId, payload);
          break;
        case EVENTS.PHOTO.TRANSFER_COMPLETE:
          this.handlePhotoTransferComplete(sessionId, payload);
          break;
        case EVENTS.LOCATION.UPDATE:
          this.handleLocation(sessionId, payload);
          break;
        default:
          console.log("Unknown event type:", type);
      }
    } catch (err) {
      console.error("Message parse error:", err);
    }
  }
  handleJoin(sessionId, payload) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const displayName = payload?.displayName?.trim() || "Guest";
    const result = this.roomService.join(sessionId, displayName);
    if (!result.ok) {
      this.send(sessionId, EVENTS.ROOM.ERROR, { message: result.reason });
      return;
    }
    session.displayName = displayName;
    this.broadcastParticipants();
    this.broadcastRoomState();
    if (this.roomService.getParticipantCount() >= result.entitlement.maxParticipants) {
      this.broadcast(EVENTS.ROOM.READY, { ready: true });
    }
  }
  handleDisconnect(sessionId) {
    const session = this.sessions.get(sessionId);
    const displayName = session?.displayName || "Unknown";
    this.sessions.delete(sessionId);
    this.roomService.leave(sessionId);
    console.log(`[Room] ${displayName} (${sessionId}) disconnected`);
    if (this.sessions.size > 0) {
      this.broadcastParticipants();
      this.broadcastRoomState();
    }
  }
  handleLeave(sessionId) {
    this.handleDisconnect(sessionId);
    this.broadcast(EVENTS.SESSION.RESET, {});
  }
  handleSessionStart(payload) {
    if (this.roomService.startSession(payload?.layout)) {
      this.broadcast(EVENTS.SESSION.START, {
        startTime: Date.now() + 1e3,
        layout: payload?.layout
      });
      this.broadcastRoomState();
    }
  }
  handleSessionLayout(payload) {
    const layout = typeof payload === "string" ? payload : payload?.layout;
    if (this.roomService.updateLayout(layout)) {
      this.broadcast(EVENTS.SESSION.LAYOUT, layout);
      this.broadcastRoomState();
    }
  }
  handleSessionReset() {
    this.roomService.resetSession();
    this.broadcast(EVENTS.SESSION.RESET, {});
    this.broadcastRoomState();
  }
  handleWebRTC(sessionId, type, payload) {
    const { to, ...rest } = payload || {};
    if (to && this.sessions.has(to)) {
      this.send(to, type, { ...rest, from: sessionId });
    } else {
      this.broadcastExcept(sessionId, type, { ...rest, from: sessionId });
    }
  }
  handlePhotoSend(sessionId, payload) {
    this.broadcastExcept(sessionId, EVENTS.PHOTO.RECEIVE, { ...payload, from: sessionId });
  }
  handlePhotoMeta(sessionId, payload) {
    this.broadcastExcept(sessionId, EVENTS.PHOTO.META, { ...payload, from: sessionId });
  }
  handlePhotoTransferComplete(sessionId, payload) {
    this.broadcastExcept(sessionId, EVENTS.PHOTO.TRANSFERRED, { ...payload, from: sessionId });
  }
  handleLocation(sessionId, payload) {
    if (typeof payload?.lat === "number") {
      this.broadcast(EVENTS.LOCATION.UPDATE, { from: sessionId, ...payload });
    }
  }
  getParticipants() {
    return [...this.sessions.entries()].filter(([_, session]) => session.displayName).map(([id, session]) => ({ id, displayName: session.displayName }));
  }
  broadcastParticipants() {
    this.broadcast(EVENTS.ROOM.JOINED, { participants: this.getParticipants() });
  }
  broadcastRoomState() {
    const snapshot = this.roomService.getSnapshot();
    const entitlement = this.roomService.getEntitlement();
    this.broadcast(EVENTS.ROOM.STATE, { ...snapshot, entitlement });
  }
  send(sessionId, type, payload) {
    const session = this.sessions.get(sessionId);
    if (session?.ws?.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({ type, payload }));
    }
  }
  broadcast(type, payload) {
    const msg = JSON.stringify({ type, payload });
    for (const session of this.sessions.values()) {
      if (session.ws?.readyState === WebSocket.OPEN) {
        session.ws.send(msg);
      }
    }
  }
  broadcastExcept(excludeId, type, payload) {
    const msg = JSON.stringify({ type, payload });
    for (const [id, session] of this.sessions) {
      if (id !== excludeId && session.ws?.readyState === WebSocket.OPEN) {
        session.ws.send(msg);
      }
    }
  }
};

// src/index.ts
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Upgrade, Connection",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    if (url.pathname === "/ws") {
      const roomId = url.searchParams.get("room");
      if (!roomId) {
        return new Response(JSON.stringify({ error: "Missing room parameter" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (!/^[a-zA-Z0-9]{1,20}$/.test(roomId)) {
        return new Response(JSON.stringify({ error: "Invalid room code" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const id = env.ROOM.idFromName(roomId.toUpperCase());
      const roomDO = env.ROOM.get(id);
      return roomDO.fetch(request);
    }
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "ldr-photobooth",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
    if (url.pathname === "/api/community/frames" && request.method === "GET") {
      try {
        const { results } = await env.DB.prepare(
          "SELECT * FROM frames ORDER BY created_at DESC"
        ).all();
        return new Response(JSON.stringify(results), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Database error", details: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }
    if (url.pathname === "/api/community/frames" && request.method === "POST") {
      try {
        const formData = await request.formData();
        const file = formData.get("file");
        const title = formData.get("title");
        const author = formData.get("author");
        const tags = formData.get("tags") || "";
        if (!file || !title || !author) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
        const id = crypto.randomUUID();
        const filename = `frames/${id}-${file.name}`;
        await env.BUCKET.put(filename, file.stream(), {
          httpMetadata: { contentType: file.type }
        });
        const publicUrl = `${url.origin}/${filename}`;
        await env.DB.prepare(
          "INSERT INTO frames (id, title, author, tags, url, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(id, title, author, tags, publicUrl, (/* @__PURE__ */ new Date()).toISOString()).run();
        return new Response(JSON.stringify({ success: true, id }), {
          status: 201,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Upload failed", details: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }
    if (url.pathname.startsWith("/frames/")) {
      const filename = url.pathname.slice(1);
      const object = await env.BUCKET.get(filename);
      if (!object) {
        return new Response("Image not found", { status: 404 });
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("Access-Control-Allow-Origin", "*");
      return new Response(object.body, { headers });
    }
    if (url.pathname === "/" || url.pathname === "/api") {
      return new Response(
        JSON.stringify({
          name: "LDR Photobooth Signaling Server",
          version: "1.1.0",
          endpoints: {
            websocket: "/ws?room=ROOMCODE",
            health: "/health",
            community_frames: "/api/community/frames"
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};

// ../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-5Lchtv/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-5Lchtv/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  RoomDurableObject,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
