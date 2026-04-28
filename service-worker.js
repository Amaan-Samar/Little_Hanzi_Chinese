
// // Cache name - increment version when content changes
// const CACHE_NAME = 'font-cache-v1';

// // Files to cache
// const urlsToCache = [
//   '/fonts/Han_Sans_CN_Light.otf'
//   // Add other font files or important assets here
// ];

// // Install service worker and cache all content
// self.addEventListener('install', event => {
//   event.waitUntil(
//     caches.open(CACHE_NAME)
//       .then(cache => {
//         console.log('Cache opened');
//         return cache.addAll(urlsToCache);
//       })
//   );
// });

// // Fetch event - serve from cache when available
// self.addEventListener('fetch', event => {
//   // Only cache font files to avoid complicating your setup
//   if (event.request.url.match(/\.(otf|ttf|woff|woff2)$/)) {
//     event.respondWith(
//       caches.match(event.request)
//         .then(response => {
//           // Return cached response if found
//           if (response) {
//             return response;
//           }
          
//           // Clone the request because it's a one-time use stream
//           const fetchRequest = event.request.clone();
          
//           // Make network request and cache the response
//           return fetch(fetchRequest).then(response => {
//             // Check if we received a valid response
//             if (!response || response.status !== 200 || response.type !== 'basic') {
//               return response;
//             }
            
//             // Clone the response because it's a one-time use stream
//             const responseToCache = response.clone();
            
//             caches.open(CACHE_NAME)
//               .then(cache => {
//                 cache.put(event.request, responseToCache);
//               });
              
//             return response;
//           });
//         })
//     );
//   } else {
//     // For non-font files, perform normal fetch
//     event.respondWith(fetch(event.request));
//   }
// });

// // Clean up old caches when new service worker activates
// self.addEventListener('activate', event => {
//   const cacheWhitelist = [CACHE_NAME];
  
//   event.waitUntil(
//     caches.keys().then(cacheNames => {
//       return Promise.all(
//         cacheNames.map(cacheName => {
//           if (cacheWhitelist.indexOf(cacheName) === -1) {
//             return caches.delete(cacheName);
//           }
//         })
//       );
//     })
//   );
// });