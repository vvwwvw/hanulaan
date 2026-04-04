import { NextRequest, NextResponse } from 'next/server'
import { notifyNewCustomer, notifyNewContract, notifyFuneralOccurred, notifyNewComment } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  const body = await req.json()

  switch (body.type) {
    case 'new_customer':
      await notifyNewCustomer(body.name, body.customerType, body.isWalking)
      break
case 'new_contract':
      await notifyNewContract(body.customerName, body.lotNumber, body.amount)
      break
    case 'funeral_occurred':
      await notifyFuneralOccurred(body.customerName, body.productType)
      break
    case 'new_comment':
      await notifyNewComment(body.customerName, body.authorName, body.role, body.content, body.source)
      break
  }

  return NextResponse.json({ ok: true })
}
