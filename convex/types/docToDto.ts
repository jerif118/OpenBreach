import type { DataModel, Doc } from "../_generated/dataModel";

export type DocToDto<TTableName extends keyof DataModel, TDto> = (
  doc: Doc<TTableName>,
) => TDto;
