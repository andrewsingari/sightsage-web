
export type Slot = string

export type Question =
  | { id: string; type: 'text' | 'number'; text: string }
  | { id: string; type: 'choice'; text: string; options: string[] }
