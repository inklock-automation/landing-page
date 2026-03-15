// Scroll reveal animation - add <script src="/reveal.js"></script> before </body> in index.html
var reveals=document.querySelectorAll('.reveal');
var revealObs=new IntersectionObserver(function(entries){
  entries.forEach(function(e){
    if(e.isIntersecting){e.target.classList.add('visible');revealObs.unobserve(e.target)}
  });
},{threshold:0.1});
reveals.forEach(function(el){revealObs.observe(el)});
