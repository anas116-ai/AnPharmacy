export interface ColumnDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  width?: number;
  visible: boolean;
  editable: boolean;
  options?: { value: string; label: string }[];
  highlight?: string;
  color?: string;
  borders?: 'left' | 'right' | 'both';
}

export interface FilterDef {
  columnKey: string;
  condition: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string;
}
