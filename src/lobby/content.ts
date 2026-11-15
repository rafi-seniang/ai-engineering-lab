/** Fixed copy and hardware facts for the single-screen AI Lab home. */

export const OWNER = {
  name: "Rafi Athallah Seniang",
  role: "AI Engineer",
  location: "Jabodetabek, Indonesia",
  email: "rafiseniangwangsa@gmail.com",
  whatsapp: "+62 896-3522-5253",
  whatsappUrl: "https://wa.me/6289635225253",
  linkedin: "https://linkedin.com/in/seniang-wangsa",
  linkedinLabel: "linkedin.com/in/seniang-wangsa",
  github: "https://github.com/rafi-seniang",
  githubLabel: "github.com/rafi-seniang",
};

export const LAB_SUBTITLE =
  "Four live AI backends running behind one gateway, combining vector search and fast decision routing with Jev, Gemini, and DeepSeek.";

export const LAB_SPECS: { label: string; value: string }[] = [
  { label: "AI model", value: "Jev, Gemini, DeepSeek" },
  { label: "On-host engine", value: "Typesense 27.1, FastAPI, Redis" },
  { label: "Runtime", value: "CPU VPS (Docker, Caddy)" },
];
