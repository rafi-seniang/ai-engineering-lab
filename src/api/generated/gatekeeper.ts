/** Generated from the backend's OpenAPI schema by scripts/generate-api-types.mjs. Do not edit. */
export interface paths {
  "/health": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Health */
    get: operations["health_health_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/meta": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Meta */
    get: operations["meta_meta_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/chat/completions": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Chat Completions */
    post: operations["chat_completions_v1_chat_completions_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/gate/check": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Check */
    post: operations["check_v1_gate_check_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/gate/stats": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Stats */
    get: operations["stats_v1_gate_stats_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/gate/events": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Events */
    get: operations["events_v1_gate_events_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    /** ChatMessage */
    ChatMessage: {
      /**
       * Role
       * @enum {string}
       */
      role: "system" | "user" | "assistant" | "tool" | "developer";
      /** Content */
      content?: string | null;
    } & {
      [key: string]: unknown;
    };
    /** ChatRequest */
    ChatRequest: {
      /** Messages */
      messages: components["schemas"]["ChatMessage"][];
      /**
       * Model
       * @default auto
       */
      model: string;
      /**
       * Stream
       * @default false
       * @constant
       */
      stream: false;
      /** Scope */
      scope?: string | null;
    } & {
      [key: string]: unknown;
    };
    /**
     * CheckRequest
     * @description A request to judge without sending it anywhere.
     */
    CheckRequest: {
      /** Messages */
      messages: components["schemas"]["ChatMessage"][];
      /** Scope */
      scope?: string | null;
    };
    /**
     * GateDecision
     * @description What the gate decided about one request, returned with every answer and logged.
     */
    GateDecision: {
      /** Injection Probability */
      injection_probability: number;
      /**
       * Off Topic Probability
       * @default 0
       */
      off_topic_probability: number;
      /** Tool Result Probability */
      tool_result_probability?: number | null;
      /** Blocked */
      blocked: boolean;
      /** Blocked By */
      blocked_by?: ("injection" | "off_topic" | "tool_result" | "tool_call") | null;
      /** Masked Identifiers */
      masked_identifiers: number;
      /** Decision Ms */
      decision_ms: number;
    };
    /** GateEvent */
    GateEvent: {
      /** Request Id */
      request_id: string;
      /** At */
      at: string;
      /**
       * Outcome
       * @enum {string}
       */
      outcome: "answered" | "cached" | "blocked" | "failed";
      /** Blocked By */
      blocked_by?: ("injection" | "off_topic" | "tool_result" | "tool_call") | null;
      /** Model */
      model: string | null;
      /** Injection Probability */
      injection_probability: number | null;
      /** Off Topic Probability */
      off_topic_probability?: number | null;
      /** Masked Identifiers */
      masked_identifiers: number;
      /** Input Tokens */
      input_tokens: number | null;
      /** Output Tokens */
      output_tokens: number | null;
      /** Decision Ms */
      decision_ms: number | null;
      /** Upstream Ms */
      upstream_ms: number | null;
      /** Preview */
      preview: string;
    };
    /** GateStats */
    GateStats: {
      /** Requests */
      requests: number;
      /** Answered */
      answered: number;
      /** Cached */
      cached: number;
      /** Blocked */
      blocked: number;
      /**
       * Off Topic Blocked
       * @default 0
       */
      off_topic_blocked: number;
      /** Failed */
      failed: number;
      /** Masked Identifiers */
      masked_identifiers: number;
      /** Tokens */
      tokens: number;
      /** Median Decision Ms */
      median_decision_ms: number | null;
      /** Median Upstream Ms */
      median_upstream_ms: number | null;
    };
    /** HTTPValidationError */
    HTTPValidationError: {
      /** Detail */
      detail?: components["schemas"]["ValidationError"][];
    };
    /**
     * ServiceMeta
     * @description What the lab frontend's lobby shows about this backend (the Lab backend contract).
     */
    ServiceMeta: {
      /** Id */
      id: string;
      /** Name */
      name: string;
      /** Summary */
      summary: string;
      /** Version */
      version: string;
      /** Engine */
      engine: string;
      /** Own Ui Path */
      own_ui_path: string;
      /** Docs Path */
      docs_path: string;
      /** Block From Injection Probability */
      block_from_injection_probability: number;
      /** Block From Off Topic Probability */
      block_from_off_topic_probability: number;
    };
    /** ValidationError */
    ValidationError: {
      /** Location */
      loc: (string | number)[];
      /** Message */
      msg: string;
      /** Error Type */
      type: string;
      /** Input */
      input?: unknown;
      /** Context */
      ctx?: Record<string, never>;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  health_health_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            [key: string]: string;
          };
        };
      };
    };
  };
  meta_meta_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ServiceMeta"];
        };
      };
    };
  };
  chat_completions_v1_chat_completions_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ChatRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            [key: string]: unknown;
          };
        };
      };
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  check_v1_gate_check_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CheckRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["GateDecision"];
        };
      };
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  stats_v1_gate_stats_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["GateStats"];
        };
      };
    };
  };
  events_v1_gate_events_get: {
    parameters: {
      query?: {
        limit?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["GateEvent"][];
        };
      };
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
}
