import type { BagPalette } from "./schema";

type SeedProduct = {
  slug: string; name: string; region: string; farm: string; producer: string; altitude: number;
  process: "lavado" | "natural" | "honey"; roast: "claro" | "medio" | "oscuro"; variety: string;
  notes: string[]; description: string; palette: BagPalette; featured?: boolean;
  /** Precio de 250 g en centavos; 500 g y 1 kg se calculan con descuento por volumen */
  price250: number; stock: [number, number, number];
};

// Fincas y productores ficticios; regiones cafetaleras reales de Venezuela.
export const SEED_PRODUCTS: SeedProduct[] = [
  {
    slug: "sanare-lavado", name: "Sanare", region: "Lara", farm: "Finca Las Neblinas", producer: "Familia Alvarado",
    altitude: 1650, process: "lavado", roast: "medio", variety: "Caturra y Bourbon",
    notes: ["Panela", "Mandarina", "Cacao"], featured: true,
    description: "Un café redondo y dulce de las montañas de Sanare. Taza limpia, acidez cítrica suave y final de cacao. Funciona igual de bien en colador que en espresso.",
    palette: { paper: "#1F4A3D", ink: "#F3F5F1", accent: "#F2A65A" }, price250: 1200, stock: [40, 25, 12],
  },
  {
    slug: "bocono-natural", name: "Boconó", region: "Trujillo", farm: "Finca El Jabillo", producer: "Rosa Briceño",
    altitude: 1480, process: "natural", roast: "claro", variety: "Typica",
    notes: ["Fresa", "Vino tinto", "Miel"], featured: true,
    description: "Secado al sol en camas africanas durante tres semanas. Afrutado, intenso y con cuerpo sedoso. Para quien busca algo distinto al café de siempre.",
    palette: { paper: "#7A2E3A", ink: "#FBEFEA", accent: "#F4C7B8" }, price250: 1550, stock: [18, 10, 4],
  },
  {
    slug: "santa-cruz-de-mora", name: "Santa Cruz de Mora", region: "Mérida", farm: "Hacienda La Victoria", producer: "Cooperativa Mocotíes",
    altitude: 1750, process: "lavado", roast: "claro", variety: "Bourbon rojo",
    notes: ["Jazmín", "Durazno", "Té negro"], featured: true,
    description: "Del valle del Mocotíes, cultivado bajo sombra de guamo y bucare. Floral y delicado, con una acidez brillante que se luce en V60 o Chemex.",
    palette: { paper: "#E9E4D0", ink: "#22302B", accent: "#3E7C59" }, price250: 1450, stock: [30, 18, 8],
  },
  {
    slug: "rubio-honey", name: "Rubio", region: "Táchira", farm: "Finca Los Cedros", producer: "Hermanos Contreras",
    altitude: 1350, process: "honey", roast: "medio", variety: "Catuaí amarillo",
    notes: ["Caramelo", "Manzana roja", "Almendra"],
    description: "Proceso honey: se seca con parte del mucílago y eso le da un dulzor de caramelo muy marcado. Equilibrado, fácil de tomar y versátil.",
    palette: { paper: "#C8862E", ink: "#2A1B0E", accent: "#FFF3DC" }, price250: 1300, stock: [35, 20, 10],
  },
  {
    slug: "biscucuy", name: "Biscucuy", region: "Portuguesa", farm: "Finca Monte Claro", producer: "Asociación Agua Blanca",
    altitude: 1200, process: "lavado", roast: "oscuro", variety: "Caturra",
    notes: ["Chocolate amargo", "Nuez", "Tabaco dulce"],
    description: "El café de la capital cafetalera de Venezuela, en un tueste oscuro de cuerpo pleno. Ideal para guayoyo cargado, moka o con leche.",
    palette: { paper: "#2B2A33", ink: "#EDE9E1", accent: "#C9A46A" }, price250: 950, stock: [60, 40, 20],
  },
  {
    slug: "caripe", name: "Caripe", region: "Monagas", farm: "Finca El Guácharo", producer: "Familia Marcano",
    altitude: 1100, process: "natural", roast: "medio", variety: "Bourbon",
    notes: ["Ciruela", "Panela", "Canela"],
    description: "Del oriente del país, cerca de la cueva del Guácharo. Un natural dulce y especiado, con cuerpo medio y final largo.",
    palette: { paper: "#3D5A80", ink: "#F1F4F8", accent: "#EE9B7A" }, price250: 1350, stock: [0, 6, 2],
  },
  {
    slug: "galipan", name: "Galipán", region: "Miranda", farm: "Finca San Isidro", producer: "Familia Rodríguez",
    altitude: 1900, process: "lavado", roast: "claro", variety: "Typica criollo",
    notes: ["Limonaria", "Flor de azahar", "Miel de abeja"],
    description: "Microlote de las faldas del Ávila, a 1.900 metros. Producción muy pequeña: cuando se acaba, hay que esperar a la próxima cosecha.",
    palette: { paper: "#F2D7D9", ink: "#3B2730", accent: "#9C4F67" }, price250: 1950, stock: [8, 3, 0],
  },
  {
    slug: "villanueva-descafeinado", name: "Villanueva Descafeinado", region: "Lara", farm: "Finca La Cumbre", producer: "Cooperativa Cumbres de Lara",
    altitude: 1550, process: "lavado", roast: "medio", variety: "Caturra",
    notes: ["Galleta", "Cacao", "Caña"],
    description: "Descafeinado por proceso de agua, sin químicos. Mantiene el dulzor y el cuerpo del café de Lara para tomar en la noche sin culpa.",
    palette: { paper: "#DDE7E4", ink: "#1F3B37", accent: "#4F8A7B" }, price250: 1250, stock: [22, 12, 5],
  },
];

/** Precio por peso con descuento por volumen (500 g −8 %, 1 kg −15 %), redondeado a 50 centavos. */
export function priceFor(price250: number, grams: 250 | 500 | 1000) {
  const factor = grams === 250 ? 1 : grams === 500 ? 2 * 0.92 : 4 * 0.85;
  return Math.round((price250 * factor) / 50) * 50;
}
