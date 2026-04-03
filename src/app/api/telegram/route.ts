import { NextRequest, NextResponse } from 'next/server'
import { notifyNewCustomer, notifyWalkingAssigned, notifyNewContract, notifyFuneralOccurred } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  const body = await req.json()

  switch (body.type) {
    case 'new_customer':
      await notifyNewCustomer(body.name, body.customerType, body.isWalking)
      break
    case 'walking_assigned':
      await notifyWalkingAssigned(body.customerName, body.salesName)
      break
    case 'new_contract':
      await notifyNewContract(body.customerName, body.lotNumber, body.amount)
      break
    case 'funeral_occurred':
      await notifyFuneralOccurred(body.customerName, body.productType)
      break
  }

  return NextResponse.json({ ok: true })
}
