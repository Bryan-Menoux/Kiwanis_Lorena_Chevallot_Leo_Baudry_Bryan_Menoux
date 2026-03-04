import { TypedPocketBase } from "./pocketbase-types";
import type { GSAP } from "gsap";
declare global {
  namespace App {
    interface Locals {
      pb: TypedPocketBase;
    }
  }

  interface Window {
    __previewData?: any;
    setGridStyles?: (count: number) => void;
    openModal?: (url: string) => void;
    gsap: GSAP;
  }

  const gsap: GSAP;
}
