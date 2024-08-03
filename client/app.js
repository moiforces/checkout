function resultMessage(message) {
  const resultElement = document.getElementById('result-message');
  if (resultElement) {
    resultElement.innerHTML = message;
  }
}

window.paypal.Buttons({
  style: {
    shape: "rect",
    layout: "vertical",
    color: "silver",
    label: "paypal",
  },
  async createOrder() {
    try {
      const amount = document.getElementById("payment-amount").value;

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart: [
            {
              id: "YOUR_PRODUCT_ID",
              quantity: amount,
            },
          ],
        }),
      });

      const orderData = await response.json();

      if (response.ok && orderData.id) {
        return orderData.id;
      }

      const errorDetail = orderData?.details?.[0];
      const errorMessage = errorDetail
        ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
        : JSON.stringify(orderData);

      throw new Error(errorMessage);
    } catch (error) {
      console.error(error);
      resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`);
      throw error; // rethrow error to stop the PayPal button spinner
    }
  },
  async onApprove(data, actions) {
    try {
      const response = await fetch(`/api/orders/${data.orderID}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const orderData = await response.json();

      const errorDetail = orderData?.details?.[0];

      if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
        return actions.restart();
      } else if (errorDetail) {
        throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
      } else if (!orderData.purchase_units) {
        throw new Error(JSON.stringify(orderData));
      } else {
        const transaction =
          orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
          orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
        resultMessage(
          `Transaction ${transaction.status}: ${transaction.id}`
        );
        console.log(
          "Capture result",
          orderData,
          JSON.stringify(orderData, null, 2)
        );
      }
    } catch (error) {
      console.error(error);
      resultMessage(
        `Sorry, your transaction could not be processed...<br><br>${error}`
      );
    }
  },
  onError(err) {
    console.error('An error occurred during the transaction', err);
    resultMessage('An error occurred during the transaction. Please try again.');
  }
}).render("#paypal-button-container");
