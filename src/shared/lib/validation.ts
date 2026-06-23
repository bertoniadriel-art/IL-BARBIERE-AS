// Esquemas de validación con Zod
import { z } from 'zod';

// Validar teléfono argentino (sin 0 ni 15, 10 dígitos)
export const phoneSchema = z
  .string()
  .min(10, 'El teléfono debe tener al menos 10 dígitos')
  .max(10, 'El teléfono debe tener exactamente 10 dígitos')
  .regex(/^[3-4]\d{9}$/, 'Formato inválido. Ej: 3402500000');

// Validar nombre (sin números ni caracteres especiales)
export const nameSchema = z
  .string()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(50, 'El nombre no puede exceder 50 caracteres')
  .regex(/^[a-zA-Z\s]+$/, 'El nombre solo puede contener letras y espacios');

// Schema para formulario de reserva
export const bookingFormSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
});

// Tipo inferido del schema
export type BookingFormData = z.infer<typeof bookingFormSchema>;

// Función de validación que retorna errores o null
export const validateBookingForm = (data: unknown) => {
  const result = bookingFormSchema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      if (err.path[0]) {
        errors[err.path[0] as string] = err.message;
      }
    });
    return errors;
  }
  return null;
};
