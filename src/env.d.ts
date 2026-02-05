import { TypedPocketBase } from "./pocketbase-types";
declare global {
  namespace App {
    interface Locals {
      pb: TypedPocketBase;
    }
  }
}
