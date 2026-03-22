export interface RawVelesBotDto {
  id: number | string;
  name?: string | null;
  exchange?: string | null;
  algorithm?: string | null;
  status?: string | null;
  substatus?: string | null;
  apiKey?: number | null;
  symbols?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  settings?: {
    type?: string | null;
  } | null;
  deposit?: {
    marginType?: string | null;
  } | null;
}

export interface RawVelesBotsListResponseDto {
  totalElements?: number;
  totalPages?: number;
  pageNumber?: number;
  content?: RawVelesBotDto[];
}
