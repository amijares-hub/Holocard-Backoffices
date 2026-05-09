import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/webhooks/payment-confirmed', {
      order_id: 'd9b2b0b0-0000-0000-0000-000000000000'
    });
    console.log('RESULTADO:', res.data);
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}
test();
