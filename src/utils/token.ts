export function calculateTokenAmount(ethAmount: string, tokenPrice: number | string): string {
  const eth = parseFloat(ethAmount)
  const price = typeof tokenPrice === 'string' ? parseFloat(tokenPrice) : tokenPrice
  
  if (isNaN(eth) || isNaN(price) || price === 0) return '0'
  return (eth / price).toFixed(2)
} 