import { NextRequest, NextResponse } from 'next/server';
import { firestore as db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export async function GET(req: NextRequest, { params }: { params: { tran_id: string } }) {
  const tran_id = params.tran_id;

  if (!tran_id) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/fail`);
  }

  try {
    const orderRef = doc(db, 'orders', tran_id);
    const orderDoc = await getDoc(orderRef);

    if (orderDoc.exists() && orderDoc.data().status === 'pending') {
      await updateDoc(orderRef, { status: 'fail' });
    }
  } catch (error) {
    console.error(`Error updating status to fail for tran_id ${tran_id}:`, error);
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment/fail`);
}
