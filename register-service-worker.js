
// // Check if the browser supports service workers
// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', function() {
//       navigator.serviceWorker.register('/service-worker.js')
//         .then(function(registration) {
//           console.log('ServiceWorker registration successful with scope: ', registration.scope);
//         })
//         .catch(function(error) {
//           console.log('ServiceWorker registration failed: ', error);
//         });
//     });
//   }