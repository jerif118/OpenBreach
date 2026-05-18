import type { ComponentPropsWithoutRef } from "react";

type MaterialSymbolProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  icon: string;
};

export function MaterialSymbol({
  className,
  icon,
  ...props
}: MaterialSymbolProps) {
  const classes = ["material-symbols-outlined", "notranslate", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} translate="no" {...props}>
      {icon}
    </span>
  );
}
