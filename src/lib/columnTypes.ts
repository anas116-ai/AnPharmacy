export interface ColumnDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  width?: number;
  visible: boolean;
  editable: boolean;
  options?: { value: string; label: string }[];
}

export interface FilterDef {
  columnKey: string;
  condition: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string;
}
