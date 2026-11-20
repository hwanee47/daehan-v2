export const defaultHeatTreatment = "Q.T/가스연질화";

export function heatTreatmentText(value: string | null | undefined): string {
  return value === "Q.T/질화" ? defaultHeatTreatment : value ?? "";
}
