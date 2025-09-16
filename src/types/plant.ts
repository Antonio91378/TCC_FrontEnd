export type PlantVars = {
  pv: number | null;
  sp: number | null;
  mv: number | null;
  cv: number | null;
  error: number | null;
  status: string | null;
};

export function emptyPlantVars(): PlantVars {
  return { pv: null, sp: null, mv: null, cv: null, error: null, status: null };
}

export type PlantSample = PlantVars & { t: number };
