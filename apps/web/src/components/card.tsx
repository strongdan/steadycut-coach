import type { PropsWithChildren } from "react";
import clsx from "clsx";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ children, className }: CardProps) {
  return (
    <section className={clsx("rounded-[28px] bg-white/90 p-5 shadow-card backdrop-blur", className)}>
      {children}
    </section>
  );
}
