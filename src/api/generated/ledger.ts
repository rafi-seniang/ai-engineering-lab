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
  "/v1/invoices": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Every invoice in the ledger, in the order it arrived */
    get: operations["list_invoices_v1_invoices_get"];
    put?: never;
    /** Read an invoice (PDF, PNG or JPEG) into the ledger, with every sum checked */
    post: operations["read_invoice_v1_invoices_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/invoices/{invoice_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get Invoice */
    get: operations["get_invoice_v1_invoices__invoice_id__get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/invoices/{invoice_id}/pages/{number}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** A page of the invoice as the model saw it */
    get: operations["invoice_page_v1_invoices__invoice_id__pages__number__get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/statement": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get Statement */
    get: operations["get_statement_v1_statement_get"];
    /** Replace the bank statement (CSV: date, description, debit, credit) */
    put: operations["put_statement_v1_statement_put"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/reconciliation": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Which debit pays which invoice, and what is still open */
    get: operations["reconciliation_v1_reconciliation_get"];
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
    /** BankLine */
    BankLine: {
      /** Position */
      position: number;
      /** Date */
      date: string;
      /** Description */
      description: string;
      /** Debit */
      debit: number;
      /** Credit */
      credit: number;
    };
    /** Body_put_statement_v1_statement_put */
    Body_put_statement_v1_statement_put: {
      /** File */
      file: string;
    };
    /** Body_read_invoice_v1_invoices_post */
    Body_read_invoice_v1_invoices_post: {
      /** File */
      file: string;
    };
    /**
     * Check
     * @description A rule checked in code on the model's answer.
     */
    Check: {
      /** Name */
      name: string;
      /** Passed */
      passed: boolean;
      /**
       * Detail
       * @default
       */
      detail: string;
    };
    /** HTTPValidationError */
    HTTPValidationError: {
      /** Detail */
      detail?: components["schemas"]["ValidationError"][];
    };
    /**
     * Invoice
     * @description The printed invoice converted in code: dates as YYYY-MM-DD, amounts in rupiah as numbers.
     */
    Invoice: {
      /** Supplier Name */
      supplier_name: string | null;
      /** Invoice Number */
      invoice_number: string | null;
      /** Invoice Date */
      invoice_date: string | null;
      /** Due Date */
      due_date: string | null;
      /** Subtotal */
      subtotal: number | null;
      /** Tax */
      tax: number | null;
      /** Total */
      total: number | null;
      /** Lines */
      lines: components["schemas"]["InvoiceLine"][];
    };
    /** InvoiceLine */
    InvoiceLine: {
      /** Description */
      description: string;
      /** Quantity */
      quantity: number | null;
      /** Unit Price */
      unit_price: number | null;
      /** Line Total */
      line_total: number | null;
    };
    /** InvoicePayment */
    InvoicePayment: {
      /** Invoice Id */
      invoice_id: string;
      /** Total */
      total: number | null;
      /** Paid */
      paid: number;
      /** Outstanding */
      outstanding: number | null;
      /**
       * Status
       * @enum {string}
       */
      status: "paid" | "part paid" | "paid twice" | "overpaid" | "unpaid" | "duplicate" | "no total";
      /** Payments */
      payments: number[];
    };
    /**
     * PaymentMatch
     * @description One debit on the statement and the invoice it pays, if any.
     */
    PaymentMatch: {
      line: components["schemas"]["BankLine"];
      /** Invoice Id */
      invoice_id: string | null;
      /** Method */
      method: ("reference" | "payee") | null;
      /** Probability */
      probability?: number | null;
    };
    /** PrintedInvoice */
    PrintedInvoice: {
      /**
       * Supplier Name
       * @description Seller name from the top of the invoice, not the buyer
       */
      supplier_name?: string | null;
      /**
       * Invoice Number
       * @description Invoice number exactly as printed, with its punctuation
       */
      invoice_number?: string | null;
      /**
       * Invoice Date
       * @description Invoice date exactly as printed, with its currency, separators and words; null when not printed
       */
      invoice_date?: string | null;
      /**
       * Due Date
       * @description Payment due date exactly as printed, with its currency, separators and words; null when not printed
       */
      due_date?: string | null;
      /**
       * Subtotal
       * @description Subtotal before tax exactly as printed, with its currency, separators and words; null when not printed
       */
      subtotal?: string | null;
      /**
       * Tax
       * @description VAT or PPN amount exactly as printed, with its currency, separators and words; null when not printed
       */
      tax?: string | null;
      /**
       * Total
       * @description Final amount to pay exactly as printed, with its currency, separators and words; null when not printed
       */
      total?: string | null;
      /**
       * Lines
       * @description One entry per printed line, in order
       */
      lines?: components["schemas"]["PrintedLine"][];
    };
    /** PrintedLine */
    PrintedLine: {
      /**
       * Description
       * @description Item exactly as printed
       */
      description: string;
      /**
       * Quantity
       * @description Quantity exactly as printed, with its currency, separators and words; null when not printed
       */
      quantity: string;
      /**
       * Unit Price
       * @description Price per unit exactly as printed, with its currency, separators and words; null when not printed
       */
      unit_price?: string | null;
      /**
       * Line Total
       * @description Amount of this line exactly as printed, with its currency, separators and words; null when not printed
       */
      line_total?: string | null;
    };
    /**
     * ReadInvoice
     * @description An invoice in the ledger: what the model copied, what code made of it, what the checks found, and the cost.
     */
    ReadInvoice: {
      /** Id */
      id: string;
      /** File Name */
      file_name: string;
      /** Read At */
      read_at: string;
      /** Read Ms */
      read_ms: number;
      printed: components["schemas"]["PrintedInvoice"];
      invoice: components["schemas"]["Invoice"];
      /** Checks */
      checks: components["schemas"]["Check"][];
      usage: components["schemas"]["UsageOut"];
      /**
       * Status
       * @enum {string}
       */
      readonly status: "clear" | "needs a look";
    };
    /** Reconciliation */
    Reconciliation: {
      /** Payments */
      payments: components["schemas"]["PaymentMatch"][];
      /** Invoices */
      invoices: components["schemas"]["InvoicePayment"][];
      /** Open Amount */
      open_amount: number;
      /** Unmatched Debits */
      unmatched_debits: number;
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
    /** UsageOut */
    UsageOut: {
      /** Model */
      model: string;
      /** Input Tokens */
      input_tokens: number;
      /** Output Tokens */
      output_tokens: number;
      /** Cost Usd */
      cost_usd: number | null;
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
  list_invoices_v1_invoices_get: {
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
          "application/json": components["schemas"]["ReadInvoice"][];
        };
      };
    };
  };
  read_invoice_v1_invoices_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "multipart/form-data": components["schemas"]["Body_read_invoice_v1_invoices_post"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReadInvoice"];
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
  get_invoice_v1_invoices__invoice_id__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        invoice_id: string;
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
          "application/json": components["schemas"]["ReadInvoice"];
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
  invoice_page_v1_invoices__invoice_id__pages__number__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        invoice_id: string;
        number: number;
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
          "image/png": unknown;
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
  get_statement_v1_statement_get: {
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
          "application/json": components["schemas"]["BankLine"][];
        };
      };
    };
  };
  put_statement_v1_statement_put: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "multipart/form-data": components["schemas"]["Body_put_statement_v1_statement_put"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BankLine"][];
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
  reconciliation_v1_reconciliation_get: {
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
          "application/json": components["schemas"]["Reconciliation"];
        };
      };
    };
  };
}
