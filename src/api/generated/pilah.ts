/** Generated from the backend's OpenAPI schema by scripts/generate-api-types.mjs. Do not edit. */
export interface paths {
  "/v1/engines": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** List Engines */
    get: operations["list_engines_v1_engines_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/sort": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Sort Items */
    post: operations["sort_items_v1_sort_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/triage": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Triage */
    post: operations["triage_v1_triage_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/triage/batch": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Triage Batch */
    post: operations["triage_batch_v1_triage_batch_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
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
  "/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Index */
    get: operations["index__get"];
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
    /** ChoiceOption */
    ChoiceOption: {
      /** Label */
      label: string;
      /**
       * Description
       * @default
       */
      description: string;
    };
    /** EngineOption */
    EngineOption: {
      /**
       * Id
       * @enum {string}
       */
      id: "laya" | "jev";
      /** Name */
      name: string;
      /** Provider */
      provider: string;
      /** Available */
      available: boolean;
      /** Status Label */
      status_label: string;
      /** Detail */
      detail: string;
    };
    /** EnginesResponse */
    EnginesResponse: {
      /** Engines */
      engines: components["schemas"]["EngineOption"][];
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
    };
    /** SortRequest */
    SortRequest: {
      /**
       * Engine
       * @default laya
       * @enum {string}
       */
      engine: "laya" | "jev";
      /** Instructions */
      instructions: string;
      /** Choices */
      choices: components["schemas"]["ChoiceOption"][];
      /**
       * Confidence Gate
       * @default 0.7
       */
      confidence_gate: number;
      /** Items */
      items: string[];
    };
    /** SortResponse */
    SortResponse: {
      /** Engine */
      engine: string;
      /** Latency Ms */
      latency_ms: number;
      /** Confidence Gate */
      confidence_gate: number;
      /** Results */
      results: components["schemas"]["SortedItem"][];
    };
    /** SortedItem */
    SortedItem: {
      /** Choice */
      choice: string;
      /** Probabilities */
      probabilities: {
        [key: string]: number;
      };
      /** Top Probability */
      top_probability: number;
      /** Checkpoint */
      checkpoint: string;
      /** Passed Gate */
      passed_gate: boolean;
    };
    /** TriageBatchRequest */
    TriageBatchRequest: {
      /** Messages */
      messages: string[];
    };
    /** TriageBatchResponse */
    TriageBatchResponse: {
      /** Engine */
      engine: string;
      /** Latency Ms */
      latency_ms: number;
      /** Review Probability Threshold */
      review_probability_threshold: number;
      /** Escalate Urgency Score */
      escalate_urgency_score: number;
      /** Results */
      results: components["schemas"]["TriagedMessage"][];
    };
    /** TriageDecision */
    TriageDecision: {
      /** Department */
      department: string;
      /** Department Probabilities */
      department_probabilities: {
        [key: string]: number;
      };
      /** Urgency Score */
      urgency_score: number;
      /** Urgency Probabilities */
      urgency_probabilities: number[];
      /** Complaint Probability */
      complaint_probability: number;
    };
    /** TriageRequest */
    TriageRequest: {
      /** Message */
      message: string;
    };
    /** TriageResponse */
    TriageResponse: {
      /**
       * Action
       * @enum {string}
       */
      action: "escalate_now" | "auto_route" | "human_review";
      decision: components["schemas"]["TriageDecision"];
      /** Engine */
      engine: string;
      /** Latency Ms */
      latency_ms: number;
    };
    /** TriagedMessage */
    TriagedMessage: {
      /**
       * Action
       * @enum {string}
       */
      action: "escalate_now" | "auto_route" | "human_review";
      decision: components["schemas"]["TriageDecision"];
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
  list_engines_v1_engines_get: {
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
          "application/json": components["schemas"]["EnginesResponse"];
        };
      };
    };
  };
  sort_items_v1_sort_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SortRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SortResponse"];
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
  triage_v1_triage_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["TriageRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TriageResponse"];
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
  triage_batch_v1_triage_batch_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["TriageBatchRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TriageBatchResponse"];
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
  index__get: {
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
          "application/json": unknown;
        };
      };
    };
  };
}
