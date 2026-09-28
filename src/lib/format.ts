export const formatNumber = (n: number) => n.toLocaleString("en-US");
export const formatMoney = (n: number, currency = "EGP") => `${formatNumber(n)} ${currency}`;
