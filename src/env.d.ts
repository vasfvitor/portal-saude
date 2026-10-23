interface ImportMetaEnv {
  /** base URL of the operator data (ans-feeds `/dados`); empty uses production. README, "Development". */
  readonly PUBLIC_DADOS_URL?: string;
  /** base URL of the CMED data (anvisa-feeds `/cmed/dados`); empty uses production. */
  readonly PUBLIC_CMED_DADOS_URL?: string;
}
