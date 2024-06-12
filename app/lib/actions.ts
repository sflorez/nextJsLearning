'use server';

import {z} from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.'
    }),
    amount: z.coerce
        .number()
        .gt(0, {message: 'Please enter an amount greater than $0.'}),
    status: z.enum(['pending', 'paid'],
        {invalid_type_error: 'Please select an invoice status.'}
    ),
    date: z.string()
});

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    }
    message?: string | null;
};

const CreateInvoice = FormSchema.omit({id: true, date: true});
const UpdateInvoice = FormSchema.omit({id: true, date: true});

export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
        customerId : formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    });
    

    if (!validatedFields.success) {
        console.log(validatedFields)
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice'
        }
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try{
        await sql`Insert into invoices (customer_id, amount, status, date) values (${customerId}, ${amountInCents},${status}, ${date})`;
    }
    catch (e: any) {
        console.log("there was an error doing something")
        return {
            message: 'Database Error: Failed to create invoice'
        }
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices')

}

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
    const validatedFields = UpdateInvoice.safeParse({
        customerId : formData.get('customerId'),
        amount : formData.get('amount'),
        status : formData.get('status')
    });

    if (!validatedFields.success){
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "bad data for editing"
            
        }
    }

    const {customerId, amount, status} = validatedFields.data;
    const amountInCents = amount * 100;

    try {
        await sql`update invoices set customer_id = ${customerId}, amount = ${amountInCents}, status=${status} where id = ${id}`;
    }
    catch (error){
        return {
            message: 'Database Error: Failed to update invoice'
        }
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    try {
        await sql`delete from invoices where id = ${id}`
    }
    catch (error) {
        return {
            message: 'Database Error: failed to delete from the database'
        }
    }
    revalidatePath('/dashboard/invoices')
}

