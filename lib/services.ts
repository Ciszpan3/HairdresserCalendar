export type ServiceDefinition = {
  id: number;
  title: string;
  minPrice: number;
  maxPrice?: number;
  color: string;
  group: string;
};

const colors = {
  blue: "#1d4ed8",
  purple: "#6d28d9",
  pink: "#be185d",
  red: "#b91c1c",
  orange: "#c2410c",
  black: "#111827",
  yellow: "#8a5d00",
  green: "#047857",
};

export const services: ServiceDefinition[] = [
  { id: 1, title: "Strzyżenie na sucho męskie", minPrice: 50, color: colors.blue, group: "Niebieski" },
  { id: 2, title: "Strzyżenie na sucho damskie", minPrice: 60, color: colors.purple, group: "Fioletowy" },
  { id: 3, title: "Strzyżenie z wysuszeniem", minPrice: 100, color: colors.purple, group: "Fioletowy" },
  { id: 4, title: "Strzyżenie z modelowaniem", minPrice: 120, maxPrice: 150, color: colors.purple, group: "Fioletowy" },
  { id: 5, title: "Modelowanie", minPrice: 80, maxPrice: 100, color: colors.pink, group: "Różowy" },
  { id: 6, title: "Loki, Fale, Spiralne", minPrice: 120, maxPrice: 150, color: colors.pink, group: "Różowy" },
  { id: 7, title: "Upięcia", minPrice: 120, maxPrice: 150, color: colors.pink, group: "Różowy" },
  { id: 8, title: "Fryzura ślubna", minPrice: 160, color: colors.pink, group: "Różowy" },
  { id: 9, title: "Trwała", minPrice: 200, maxPrice: 300, color: colors.red, group: "Czerwony" },
  { id: 10, title: "Styling", minPrice: 220, maxPrice: 350, color: colors.red, group: "Czerwony" },
  { id: 11, title: "Farbowanie włosy krótkie", minPrice: 200, color: colors.orange, group: "Pomarańczowy" },
  { id: 12, title: "Farbowanie włosy średnie", minPrice: 250, maxPrice: 300, color: colors.orange, group: "Pomarańczowy" },
  { id: 13, title: "Farbowanie włosy długie", minPrice: 400, maxPrice: 500, color: colors.orange, group: "Pomarańczowy" },
  { id: 14, title: "Pasemka włosy krótkie", minPrice: 250, color: colors.orange, group: "Pomarańczowy" },
  { id: 15, title: "Pasemka włosy średnie", minPrice: 300, color: colors.orange, group: "Pomarańczowy" },
  { id: 16, title: "Pasemka włosy długie", minPrice: 400, maxPrice: 500, color: colors.orange, group: "Pomarańczowy" },
  { id: 17, title: "Ombre, Sombre", minPrice: 400, maxPrice: 500, color: colors.orange, group: "Pomarańczowy" },
  { id: 18, title: "Farbowanie metodą AirTouch", minPrice: 600, maxPrice: 1200, color: colors.orange, group: "Pomarańczowy" },
  { id: 19, title: "Przedłużanie i zagęszczanie włosów", minPrice: 1800, maxPrice: 2500, color: colors.black, group: "Czarny" },
  { id: 20, title: "Botox, Laminacja, Regeneracja", minPrice: 300, maxPrice: 400, color: colors.yellow, group: "Żółty" },
  { id: 21, title: "Keratynowe prostowanie", minPrice: 450, color: colors.yellow, group: "Żółty" },
  { id: 22, title: "Badanie trychologiczne – konsultacja", minPrice: 200, color: colors.green, group: "Zielony" },
  { id: 23, title: "Peeling", minPrice: 170, color: colors.yellow, group: "Żółty" },
  { id: 24, title: "Stylizacja brody + strzyżenie", minPrice: 100, color: colors.blue, group: "Niebieski" },
  { id: 25, title: "Pielęgnacja", minPrice: 50, maxPrice: 100, color: colors.yellow, group: "Żółty" },
];

export const normalizeSearch = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pl-PL").trim();

export const getServiceColor = (title: string) => {
  const normalized = normalizeSearch(title);
  return services.find((service) => normalizeSearch(service.title) === normalized)?.color ?? "#51477f";
};

export const formatServicePrice = (service: ServiceDefinition) =>
  service.maxPrice ? `${service.minPrice}–${service.maxPrice} zł` : `${service.minPrice} zł`;
