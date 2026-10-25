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
  "/v1/search": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Search
     * @description `picture` runs pure semantic vector search in Typesense, `caption` matches words, `hybrid` fuses both.
     */
    get: operations["search_v1_search_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/search/image": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Search By Image
     * @description Photographs that look like the uploaded picture.
     */
    post: operations["search_by_image_v1_search_image_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/photographs": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List Photographs
     * @description Recent photographs in the collection, filtered by origin (upload, met or all) and optional tag.
     */
    get: operations["list_photographs_v1_photographs_get"];
    put?: never;
    /**
     * Add Photographs
     * @description Embed one or more pictures with EmbeddingGemma 2 and index them into Typesense.
     */
    post: operations["add_photographs_v1_photographs_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/photographs/{photograph_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    /**
     * Delete Photograph
     * @description Delete a user-uploaded picture from Typesense and local storage.
     */
    delete: operations["delete_photograph_v1_photographs__photograph_id__delete"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/photographs/{photograph_id}/similar": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Similar
     * @description Photographs that look like one in the collection, using its stored vector in Typesense.
     */
    get: operations["similar_v1_photographs__photograph_id__similar_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/collection": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Collection */
    get: operations["collection_v1_collection_get"];
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
    /** Body_add_photographs_v1_photographs_post */
    Body_add_photographs_v1_photographs_post: {
      /** Files */
      files: string[];
      /** Title */
      title?: string | null;
      /**
       * Tags
       * @default
       */
      tags: string;
    };
    /** Body_search_by_image_v1_search_image_post */
    Body_search_by_image_v1_search_image_post: {
      /** File */
      file: string;
    };
    /** CollectionInfo */
    CollectionInfo: {
      /** Photographs */
      photographs: number;
      /** Uploaded */
      uploaded: number;
      /** Archive */
      archive: number;
      /** Vector Store */
      vector_store: string;
      /** Subjects */
      subjects: components["schemas"]["SubjectCount"][];
      /** Model */
      model: string;
      /** Dimensions */
      dimensions: number;
      /** Source */
      source: string;
      /** Licence */
      licence: string;
    };
    /** DeleteResult */
    DeleteResult: {
      /** Deleted Id */
      deleted_id: string;
      /** Total Photographs */
      total_photographs: number;
    };
    /** HTTPValidationError */
    HTTPValidationError: {
      /** Detail */
      detail?: components["schemas"]["ValidationError"][];
    };
    /** Hit */
    Hit: {
      photograph: components["schemas"]["Photograph"];
      /** Score */
      score: number;
      /** In Caption */
      in_caption: boolean;
    };
    /** IngestResult */
    IngestResult: {
      /** Added */
      added: components["schemas"]["Photograph"][];
      /** Total Photographs */
      total_photographs: number;
      /** Took Ms */
      took_ms: number;
    };
    /** Photograph */
    Photograph: {
      /** Id */
      id: string;
      /** Title */
      title: string;
      /** Artist */
      artist: string;
      /** Date */
      date: string;
      /** Medium */
      medium: string;
      /** Tags */
      tags: string[];
      /** Image */
      image: string;
      /** Width */
      width: number;
      /** Height */
      height: number;
      /** Source Url */
      source_url: string;
      /** Licence */
      licence: string;
      /**
       * Origin
       * @default met
       * @enum {string}
       */
      origin: "met" | "upload";
      /**
       * Created At
       * @default 0
       */
      created_at: number;
    };
    /** SearchResult */
    SearchResult: {
      /** Query */
      query: string;
      /** Mode */
      mode: string;
      /** Took Ms */
      took_ms: number;
      /** Hits */
      hits: components["schemas"]["Hit"][];
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
    /** SubjectCount */
    SubjectCount: {
      /** Subject */
      subject: string;
      /** Photographs */
      photographs: number;
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
  search_v1_search_get: {
    parameters: {
      query: {
        /** @description What to look for, in any language */
        q: string;
        mode?: "hybrid" | "picture" | "caption";
        origin?: "all" | "upload" | "met";
        /** @description Results to return. The service's default when left out. */
        limit?: number | null;
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
          "application/json": components["schemas"]["SearchResult"];
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
  search_by_image_v1_search_image_post: {
    parameters: {
      query?: {
        origin?: "all" | "upload" | "met";
        /** @description Results to return. The service's default when left out. */
        limit?: number | null;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "multipart/form-data": components["schemas"]["Body_search_by_image_v1_search_image_post"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SearchResult"];
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
  list_photographs_v1_photographs_get: {
    parameters: {
      query?: {
        origin?: "all" | "upload" | "met";
        /** @description Filter by subject or Untagged */
        tag?: string | null;
        /** @description Results to return. The service's default when left out. */
        limit?: number | null;
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
          "application/json": components["schemas"]["SearchResult"];
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
  add_photographs_v1_photographs_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "multipart/form-data": components["schemas"]["Body_add_photographs_v1_photographs_post"];
      };
    };
    responses: {
      /** @description Successful Response */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["IngestResult"];
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
  delete_photograph_v1_photographs__photograph_id__delete: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        photograph_id: string;
      };
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
          "application/json": components["schemas"]["DeleteResult"];
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
  similar_v1_photographs__photograph_id__similar_get: {
    parameters: {
      query?: {
        /** @description Results to return. The service's default when left out. */
        limit?: number | null;
      };
      header?: never;
      path: {
        photograph_id: string;
      };
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
          "application/json": components["schemas"]["SearchResult"];
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
  collection_v1_collection_get: {
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
          "application/json": components["schemas"]["CollectionInfo"];
        };
      };
    };
  };
}
