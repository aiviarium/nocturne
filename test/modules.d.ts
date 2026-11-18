declare module "@babel/core" {
  export function transformAsync(
    code: string,
    options: Record<string, unknown>,
  ): Promise<{ code?: string | null } | null>
}
declare module "babel-preset-solid"
declare module "@babel/preset-typescript"
