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
  "Five standalone FastAPI backends sharing one 8 GB RTX 5050, DeepSeek V4.1, and Typesense. Services open when their port is on.";

export const LAB_SPECS: { label: string; value: string }[] = [
  { label: "Local GPU", value: "RTX 5050 Laptop, 8 GB VRAM" },
  { label: "Local models", value: "Laya, EmbeddingGemma 2, DeBERTa" },
  { label: "Cloud & vector", value: "DeepSeek V4.1, Typesense 27.1" },
];
