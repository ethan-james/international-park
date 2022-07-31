import { FormEvent, useEffect, useState } from "react";
import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import { getSession, useUser } from '@auth0/nextjs-auth0';
import {
  PaymentElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import { PaymentIntent } from "@stripe/stripe-js/types";
import { Button } from "@mui/material"
import { PrismaClient } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import styles from '../styles/Home.module.css'

export async function getServerSideProps({ req, res }: { req: NextApiRequest, res: NextApiResponse }) {
  const prisma = new PrismaClient()
  const session = getSession(req, res);
  const email = session?.user.email || "";
  const hectares = await prisma.hectare.findFirst({ where: { email } });

  return {
    props : { hectares }
  }
}

const Home: NextPage = (props) => {
  const { user, error, isLoading } = useUser();
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
      "payment_intent_client_secret"
    );

    if (!clientSecret) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case "succeeded":
          setMessage("Payment succeeded!");
          break;
        case "processing":
          setMessage("Your payment is processing.");
          break;
        case "requires_payment_method":
          setMessage("Your payment was not successful, please try again.");
          break;
        default:
          setMessage("Something went wrong.");
          break;
      }
    });
  }, [stripe]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const return_url = window.location.hostname === "localhost" ?
      `http://${window.location.hostname}:${window.location.port}/api/payment` :
      `https://${window.location.hostname}/api/payment`;

    const data = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url },
    });

    const { error } = data;
    debugger;

    if (error.type === "card_error" || error.type === "validation_error") {
      setMessage(error?.message || "");
    } else {
      setMessage("An unexpected error occurred.");
    }

    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <div className={styles.grid}>
          <form id="payment-form" onSubmit={handleSubmit}>
            <PaymentElement id="payment-element" />
            <Button disabled={isLoading || !stripe || !elements} className="btn" type="submit" variant="contained">
              <span id="button-text">
                {isLoading ? <div className="spinner" id="spinner"></div> : "Pay now"}
              </span>
            </Button>
            {/* Show any error or success messages */}
            {message && <div id="payment-message">{message}</div>}
          </form>
        </div>
        <div>
          <p>
          {user ?
            <a href="/api/auth/logout">Logout</a> :
            <a href="/api/auth/login">Login</a>
          }
          </p>
        </div>
      </main>
    </div>
  )
}

export default Home
