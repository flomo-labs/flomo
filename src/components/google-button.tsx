import type { ComponentProps } from "react";
import { GoogleLogo } from "@/components/google-logo";
import { cn } from "@/lib/utils";

// Botão do Google seguindo o HTML e o CSS das diretrizes de marca (classes
// `gsi-material-button`), no tema escuro porque o app é sempre escuro: fundo
// #131314, traço de 1px #8E918F, texto #E3E3E3 em Roboto Medium 14px com
// letter-spacing de 0,25px, logo de 20px com 10px à direita, 12px de padding
// lateral, 40px de altura (44px no toque, padrão do app) e a camada de estado
// (branca, hover 8%, foco/clique 12%). As cores são da marca, não dos tokens do Flomo.
// Formato pílula (`border-radius: 20px` do CSS aprovado).
export function GoogleButton({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="submit"
      className={cn(
        "group relative h-10 w-auto max-w-[400px] min-w-min overflow-hidden rounded-[20px] border border-[#8E918F] bg-[#131314] px-3 text-center align-middle font-(family-name:--font-roboto) text-sm tracking-[0.25px] whitespace-nowrap text-[#E3E3E3] transition-[background-color,border-color,box-shadow] duration-[218ms] outline-none select-none pointer-coarse:h-11 enabled:hover:shadow-[0_1px_2px_0_rgba(60,64,67,.30),0_1px_3px_1px_rgba(60,64,67,.15)] disabled:cursor-default disabled:border-[#8E918F1F] disabled:bg-[#13131461]",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-white opacity-0 transition-opacity duration-[218ms] group-enabled:group-hover:opacity-[8%] group-enabled:group-focus:opacity-[12%] group-enabled:group-active:opacity-[12%]" />
      <div className="relative flex h-full w-full flex-row flex-nowrap items-center justify-between">
        <div className="mr-2.5 h-5 w-5 min-w-5 group-disabled:opacity-[38%]">
          <GoogleLogo className="block size-5" />
        </div>
        <span className="grow overflow-hidden align-top font-medium text-ellipsis group-disabled:opacity-[38%]">
          {children}
        </span>
      </div>
    </button>
  );
}
