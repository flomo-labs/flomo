import { z } from "zod";

// Meia estrela em decimos de estrela: 1 a 10 (7 = 3,5 estrelas).
export const halfStarsSchema = z.number().int().min(1).max(10);

export type HalfStars = z.infer<typeof halfStarsSchema>;
