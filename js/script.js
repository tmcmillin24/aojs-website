document.addEventListener("DOMContentLoaded", () => {

  setupMobileNavigation();
  loadGoogleReviews();
  setupWorkCarousel();
  setupCareerForm();
  setupContactForm();
  setupQuoteForm();

});


/* ==================================================
   MOBILE NAVIGATION
================================================== */

function setupMobileNavigation() {

  const menuButton =
    document.getElementById("mobile-menu-button");

  const mobileNav =
    document.getElementById("mobile-nav");

  const servicesButton =
    document.getElementById("mobile-services-button");

  const servicesMenu =
    document.getElementById("mobile-services-menu");


  if (
    !menuButton ||
    !mobileNav ||
    !servicesButton ||
    !servicesMenu
  ) {
    return;
  }


  /* MAIN HAMBURGER */

  menuButton.addEventListener("click", event => {

    event.stopPropagation();

    const isOpen =
      mobileNav.classList.toggle("open");

    menuButton.classList.toggle(
      "open",
      isOpen
    );

    menuButton.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

    if (!isOpen) {
      closeMobileServices();
    }

  });


  /* SERVICES DROPDOWN */

  servicesButton.addEventListener("click", event => {

    event.stopPropagation();

    const isOpen =
      servicesMenu.classList.toggle("open");

    servicesButton.classList.toggle(
      "open",
      isOpen
    );

    servicesButton.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

  });


  /* CLOSE AFTER LINK CLICK */

  mobileNav
    .querySelectorAll("a")
    .forEach(link => {

      link.addEventListener(
        "click",
        closeMobileMenu
      );

    });


  /* CLOSE WHEN CLICKING OUTSIDE */

  document.addEventListener("click", event => {

    if (
      !mobileNav.contains(event.target) &&
      !menuButton.contains(event.target)
    ) {

      closeMobileMenu();

    }

  });


  /* RESET ON DESKTOP */

  window.addEventListener("resize", () => {

    if (window.innerWidth > 768) {
      closeMobileMenu();
    }

  });


  function closeMobileMenu() {

    mobileNav.classList.remove("open");

    menuButton.classList.remove("open");

    menuButton.setAttribute(
      "aria-expanded",
      "false"
    );

    closeMobileServices();

  }


  function closeMobileServices() {

    servicesMenu.classList.remove("open");

    servicesButton.classList.remove("open");

    servicesButton.setAttribute(
      "aria-expanded",
      "false"
    );

  }

}


/* ==================================================
   GOOGLE REVIEWS
================================================== */

async function loadGoogleReviews() {

  const reviewsGrid =
    document.getElementById("reviews-grid");

  const ratingDisplay =
    document.getElementById("google-rating");

  const viewReviewsButton =
    document.getElementById("view-google-reviews");


  /*
    Pages without the review section
    simply skip this function.
  */

  if (
    !reviewsGrid ||
    !ratingDisplay ||
    !viewReviewsButton
  ) {
    return;
  }


  try {

    const response =
      await fetch("/api/reviews");


    if (!response.ok) {

      throw new Error(
        "Unable to load Google reviews."
      );

    }


    const data =
      await response.json();


    /* GOOGLE RATING */

    if (data.rating) {

      ratingDisplay.textContent =
        `${data.rating} on Google · ${data.reviewCount} reviews`;

    } else {

      ratingDisplay.textContent =
        `${data.reviewCount} Google reviews`;

    }


    /* GOOGLE MAPS LINK */

    if (data.googleMapsUrl) {

      viewReviewsButton.href =
        data.googleMapsUrl;

    } else {

      viewReviewsButton.style.display =
        "none";

    }


    reviewsGrid.innerHTML = "";


    if (
      !data.reviews ||
      data.reviews.length === 0
    ) {

      reviewsGrid.innerHTML = `
        <p class="review-error">
          Google reviews are currently unavailable.
        </p>
      `;

      return;

    }


    data.reviews.forEach(review => {

      const reviewCard =
        document.createElement("article");

      reviewCard.classList.add(
        "review-card"
      );


      const stars =
        createStars(review.rating);


      const fullName =
        review.name ||
        "Google Reviewer";


      const displayName =
        formatReviewerName(fullName);


      const safeText =
        review.text ||
        "Rated this business on Google.";


      const firstLetter =
        displayName
          .charAt(0)
          .toUpperCase();


      let authorImage;


      if (review.profilePhoto) {

        authorImage = `
          <img
            src="${review.profilePhoto}"
            alt=""
            class="review-author-photo"
            referrerpolicy="no-referrer"
          >
        `;

      } else {

        authorImage = `
          <div class="review-author-placeholder">
            ${escapeHTML(firstLetter)}
          </div>
        `;

      }


      reviewCard.innerHTML = `

        <div class="review-stars">
          ${stars}
        </div>

        <p class="review-text">
          “${escapeHTML(safeText)}”
        </p>

        <div class="review-author">

          ${authorImage}

          <div>

            <div class="review-author-name">
              ${escapeHTML(displayName)}
            </div>

            <div class="review-source">
              Google Review
            </div>

          </div>

        </div>

      `;


      reviewsGrid.appendChild(
        reviewCard
      );

    });


  } catch (error) {

    console.error(
      "Google review error:",
      error
    );


    ratingDisplay.textContent =
      "Google Reviews";


    reviewsGrid.innerHTML = `
      <p class="review-error">
        Reviews are temporarily unavailable.
      </p>
    `;


    viewReviewsButton.style.display =
      "none";

  }

}


/* ==================================================
   WORK CAROUSEL
================================================== */

function setupWorkCarousel() {

  const track =
    document.getElementById("work-track");

  const previousButton =
    document.getElementById("work-prev");

  const nextButton =
    document.getElementById("work-next");

  if (
    !track ||
    !previousButton ||
    !nextButton
  ) {
    return;
  }

  const cards =
    Array.from(
      track.querySelectorAll(".work-card")
    );

  if (cards.length === 0) {
    return;
  }

  const reduceMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  let startIndex = 0;


  function getCardsPerView() {

    if (
      window.matchMedia(
        "(max-width: 768px)"
      ).matches
    ) {
      return 1;
    }

    if (
      window.matchMedia(
        "(max-width: 1000px)"
      ).matches
    ) {
      return 2;
    }

    return 3;
  }


  function getMaxStart() {

    return Math.max(
      0,
      cards.length -
      getCardsPerView()
    );
  }


  function renderCarousel(
    direction = null
  ) {

    const cardsPerView =
      getCardsPerView();

    const maxStart =
      getMaxStart();

    startIndex =
      Math.min(
        Math.max(startIndex, 0),
        maxStart
      );

    track.classList.remove(
      "slide-next",
      "slide-prev"
    );

    cards.forEach(
      (card, index) => {

        const isVisible =
          index >= startIndex &&
          index < startIndex + cardsPerView;

        card.classList.toggle(
          "is-visible",
          isVisible
        );

        card.setAttribute(
          "aria-hidden",
          isVisible
            ? "false"
            : "true"
        );
      }
    );

    if (
      direction &&
      !reduceMotion
    ) {

      /*
        Force the browser to register the
        class removal before re-adding the
        directional animation class.
      */

      void track.offsetWidth;

      track.classList.add(
        direction === "next"
          ? "slide-next"
          : "slide-prev"
      );
    }
  }


  function movePrevious() {

    const maxStart =
      getMaxStart();

    startIndex =
      startIndex <= 0
        ? maxStart
        : startIndex - 1;

    renderCarousel("previous");
  }


  function moveNext() {

    const maxStart =
      getMaxStart();

    startIndex =
      startIndex >= maxStart
        ? 0
        : startIndex + 1;

    renderCarousel("next");
  }


  previousButton.addEventListener(
    "click",
    movePrevious
  );

  nextButton.addEventListener(
    "click",
    moveNext
  );


  let resizeTimer;

  window.addEventListener(
    "resize",
    () => {

      window.clearTimeout(
        resizeTimer
      );

      resizeTimer =
        window.setTimeout(
          () => {
            startIndex = 0;
            renderCarousel();
          },
          150
        );
    }
  );


  renderCarousel();
}


/* ==================================================
   CAREER APPLICATION
================================================== */

function setupCareerForm() {

  const form =
    document.getElementById("career-form");

  const submitButton =
    document.getElementById(
      "career-submit-button"
    );

  const status =
    document.getElementById(
      "career-form-status"
    );


  /*
    Pages without Careers form
    simply skip this.
  */

  if (
    !form ||
    !submitButton ||
    !status
  ) {
    return;
  }


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      status.textContent = "";

      status.classList.remove(
        "success",
        "error"
      );


      submitButton.disabled = true;

      submitButton.textContent =
        "Submitting...";


      try {

        const formData =
          new FormData(form);


        const application = {

          name:
            formData.get("name"),

          phone:
            formData.get("phone"),

          email:
            formData.get("email"),

          address:
            formData.get("address"),

          cityState:
            formData.get("cityState"),

          availability:
            formData.getAll("availability"),

          startDate:
            formData.get("startDate"),

          previousCompany:
            formData.get(
              "previousCompany"
            ),

          previousCompanyPhone:
            formData.get(
              "previousCompanyPhone"
            ),

          previousSupervisor:
            formData.get(
              "previousSupervisor"
            ),

          stillEmployed:
            formData.get(
              "stillEmployed"
            ),

          experience:
            formData.get("experience"),

          referenceOne:
            formData.get(
              "referenceOne"
            ),

          referenceOnePhone:
            formData.get(
              "referenceOnePhone"
            ),

          referenceTwo:
            formData.get(
              "referenceTwo"
            ),

          referenceTwoPhone:
            formData.get(
              "referenceTwoPhone"
            ),

          message:
            formData.get("message"),

          turnstileToken:
            formData.get("cf-turnstile-response")

        };


        const response =
          await fetch(
            "/api/careers",
            {

              method: "POST",

              headers: {

                "Content-Type":
                  "application/json"

              },

              body:
                JSON.stringify(
                  application
                )

            }
          );


        const result =
          await response.json();


        if (!response.ok) {

          throw new Error(
            result.error ||
            "Unable to submit application."
          );

        }


        form.reset();


        status.textContent =
          "Thank you. Your application has been submitted.";


        status.classList.add(
          "success"
        );


      } catch (error) {

        console.error(
          "Career form error:",
          error
        );


        status.textContent =
          "We couldn't submit your application. Please try again.";


        status.classList.add(
          "error"
        );


      } finally {

        submitButton.disabled =
          false;


        submitButton.innerHTML = `
          Submit Application
          <span>→</span>
        `;

      }

    }
  );

}


/* ==================================================
   CONTACT FORM
================================================== */

function setupContactForm() {

  const form =
    document.getElementById(
      "contact-form"
    );

  const submitButton =
    document.getElementById(
      "contact-submit-button"
    );

  const status =
    document.getElementById(
      "contact-form-status"
    );


  /*
    Pages without Contact form
    simply skip this.
  */

  if (
    !form ||
    !submitButton ||
    !status
  ) {
    return;
  }


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      status.textContent = "";

      status.classList.remove(
        "success",
        "error"
      );


      submitButton.disabled = true;

      submitButton.textContent =
        "Sending...";


      try {

        const formData =
          new FormData(form);


        const contactData = {

          name:
            formData.get("name"),

          phone:
            formData.get("phone"),

          email:
            formData.get("email"),

          message:
            formData.get("message"),

          turnstileToken:
            formData.get("cf-turnstile-response")

        };


        const response =
          await fetch(
            "/api/contact",
            {

              method: "POST",

              headers: {

                "Content-Type":
                  "application/json"

              },

              body:
                JSON.stringify(
                  contactData
                )

            }
          );


        const result =
          await response.json();


        if (!response.ok) {

          throw new Error(
            result.error ||
            "Unable to send message."
          );

        }


        form.reset();


        status.textContent =
          "Thank you! Your message has been sent.";


        status.classList.add(
          "success"
        );


      } catch (error) {

        console.error(
          "Contact form error:",
          error
        );


        status.textContent =
          "We couldn't send your message. Please try again.";


        status.classList.add(
          "error"
        );


      } finally {

        submitButton.disabled =
          false;


        submitButton.innerHTML = `
          Send Message
          <span>→</span>
        `;

      }

    }
  );

}




/* ==================================================
   QUOTE FORM
================================================== */

function setupQuoteForm() {

  const form =
    document.getElementById(
      "quote-form"
    );

  const submitButton =
    document.getElementById(
      "quote-submit-button"
    );

  const status =
    document.getElementById(
      "quote-form-status"
    );


  if (
    !form ||
    !submitButton ||
    !status
  ) {
    return;
  }


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      status.textContent =
        "";


      status.classList.remove(
        "success",
        "error"
      );


      submitButton.disabled =
        true;


      submitButton.textContent =
        "Submitting...";


      try {

        const formData =
          new FormData(
            form
          );


        const quoteData = {

          firstName:
            formData.get(
              "firstName"
            ),

          lastName:
            formData.get(
              "lastName"
            ),

          company:
            formData.get(
              "company"
            ),

          email:
            formData.get(
              "email"
            ),

          phone:
            formData.get(
              "phone"
            ),

          address:
            formData.get(
              "address"
            ),

          addressTwo:
            formData.get(
              "addressTwo"
            ),

          city:
            formData.get(
              "city"
            ),

          state:
            formData.get(
              "state"
            ),

          zip:
            formData.get(
              "zip"
            ),

          squareFeet:
            formData.get(
              "squareFeet"
            ),

          service:
            formData.get(
              "service"
            ),

          frequency:
            formData.get(
              "frequency"
            ),

          cleaningTime:
            formData.get(
              "cleaningTime"
            ),

          startDate:
            formData.get(
              "startDate"
            ),

          details:
            formData.get(
              "details"
            ),

          additional:
            formData.get(
              "additional"
            ),

          turnstileToken:
	    formData.get(
              "cf-turnstile-response"
            )



        };


        const response =
          await fetch(
            "/api/quote",
            {

              method:
                "POST",

              headers: {

                "Content-Type":
                  "application/json"

              },

              body:
                JSON.stringify(
                  quoteData
                )

            }
          );


        const result =
          await response.json();


        if (!response.ok) {

          throw new Error(
            result.error ||
            "Unable to submit quote request."
          );

        }


        form.reset();


        status.textContent =
          "Thank you! Your quote request has been submitted.";


        status.classList.add(
          "success"
        );


      } catch (error) {

        console.error(
          "Quote form error:",
          error
        );


        status.textContent =
          "We couldn't submit your quote request. Please try again.";


        status.classList.add(
          "error"
        );


      } finally {

        submitButton.disabled =
          false;


        submitButton.innerHTML =
          `
            Submit Quote Request
            <span>→</span>
          `;

      }

    }
  );

}

/* ==================================================
   FORMAT REVIEWER NAME
================================================== */

function formatReviewerName(fullName) {

  const parts =
    fullName
      .trim()
      .split(/\s+/);


  if (parts.length === 1) {

    return parts[0];

  }


  const firstName =
    parts[0];


  const lastInitial =
    parts[
      parts.length - 1
    ]
      .charAt(0)
      .toUpperCase();


  return `${firstName} ${lastInitial}.`;

}


/* ==================================================
   CREATE STAR RATING
================================================== */

function createStars(rating) {

  const roundedRating =
    Math.round(
      rating || 5
    );


  let stars = "";


  for (
    let i = 1;
    i <= 5;
    i++
  ) {

    stars +=
      i <= roundedRating
        ? "★"
        : "☆";

  }


  return stars;

}


/* ==================================================
   BASIC HTML ESCAPING
================================================== */

function escapeHTML(value) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}