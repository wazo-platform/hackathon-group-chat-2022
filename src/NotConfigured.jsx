const NotConfigured = () => (
  <p>
    Please defined server config in the URL:{' '}
    <code>{window.location.origin}/?host=MY_HOST&username=MY_USERNAME&password=MY_PASSWORD</code>
  </p>
);

export default NotConfigured;
