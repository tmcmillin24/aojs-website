require("dotenv").config();

const express = require("express");

const path = require("path");

const fs = require("fs").promises;

const nodemailer = require("nodemailer");

const rateLimit = require("express-rate-limit");

const helmet = require("helmet");

const app = express();

const PORT = process.env.PORT || 3000;



function formatRequestTime() {

  return new Intl.DateTimeFormat(

    "en-US",

    {

      timeZone:

        "America/Chicago",

      hour:

        "numeric",

      minute:

        "2-digit",

      second:

        "2-digit"

    }

  )

    .format(

      new Date()

    );

}



function identifyDevice(

  userAgent

) {

  const ua =

    String(

      userAgent || ""

    )

      .toLowerCase();



  let device =

    "Desktop";



  if (

    ua.includes("iphone")

  ) {

    device =

      "iPhone";

  } else if (

    ua.includes("ipad")

  ) {

    device =

      "iPad";

  } else if (

    ua.includes("android")

  ) {

    device =

      "Android";

  } else if (

    ua.includes("mobile")

  ) {

    device =

      "Mobile";

  } else if (

    ua.includes("macintosh")

  ) {

    device =

      "Mac";

  } else if (

    ua.includes("windows")

  ) {

    device =

      "Windows PC";

  }



  let browser =

    "Browser";



  if (

    ua.includes("edg/")

  ) {

    browser =

      "Edge";

  } else if (

    ua.includes("chrome/")

  ) {

    browser =

      "Chrome";

  } else if (

    ua.includes("safari/") &&

    !ua.includes("chrome/")

  ) {

    browser =

      "Safari";

  } else if (

    ua.includes("firefox/")

  ) {

    browser =

      "Firefox";

  }



  return `${device} ${browser}`;

}



function getVisitorIp(req) {

  const cloudflareIp =

    req.headers[

      "cf-connecting-ip"

    ];



  if (cloudflareIp) {

    return cloudflareIp;

  }



  const forwardedFor =

    req.headers[

      "x-forwarded-for"

    ];



  if (forwardedFor) {

    return String(

      forwardedFor

    )

      .split(",")[0]

      .trim();

  }



  return (

    req.socket

      ?.remoteAddress ||

    "unknown"

  );

}

const PLACE_ID = "ChIJi8ethW9SmogRCuV9K0g2yFg";



/* =========================

   GOOGLE REVIEW CACHE

\========================= */

let reviewCache = null;

let reviewCacheTimestamp = 0;

const REVIEW_CACHE_DURATION =

  7 * 24 * 60 * 60 * 1000;



/* =========================

   STORAGE

\========================= */

const STORAGE_DIRECTORY =

  path.join(__dirname, "storage");

const CAREER_FILE =

  path.join(

    STORAGE_DIRECTORY,

    "career-applications.json"

  );

const CONTACT_FILE =

  path.join(

    STORAGE_DIRECTORY,

    "contact-messages.json"

  );

const QUOTE_FILE =

  path.join(

    STORAGE_DIRECTORY,

    "quote-requests.json"

  );



/* =========================

   EMAIL

\========================= */

const FORM_RECIPIENT_EMAIL =
  process.env.FORM_RECIPIENT_EMAIL;

const emailTransporter =

  nodemailer.createTransport({

    host:

      "smtp-relay.brevo.com",

    port:

      587,

    secure:

      false,

    auth: {

      user:

        process.env.BREVO_SMTP_LOGIN,

      pass:

        process.env.BREVO_SMTP_KEY

    }

  });



async function sendFormEmail({

  subject,

  text,

  html,

  replyTo

}) {

  if (

    !process.env.BREVO_SMTP_LOGIN ||

    !process.env.BREVO_SMTP_KEY

  ) {

    console.warn(

      "Email not sent because BREVO_SMTP_LOGIN or BREVO_SMTP_KEY is missing."

    );

    return {

      sent: false

    };

  }



  await emailTransporter.sendMail({

    from:

      `"All Over Janitorial Services" <${process.env.BREVO_SENDER_EMAIL}>`,

    to:

      FORM_RECIPIENT_EMAIL,

    replyTo:

      replyTo || undefined,

    subject:

      subject,

    text:

      text,

    html:

      html || undefined

  });



  return {

    sent: true

  };

}



/* =========================

   JSON FILE HELPERS

\========================= */

async function appendToJsonFile(

  filePath,

  entry

) {

  await fs.mkdir(

    STORAGE_DIRECTORY,

    {

      recursive: true

    }

  );



  let entries = [];



  try {

    const existingData =

      await fs.readFile(

        filePath,

        "utf8"

      );



    entries =

      JSON.parse(

        existingData

      );



    if (

      !Array.isArray(

        entries

      )

    ) {

      entries = [];

    }

  } catch (error) {

    if (

      error.code !==

      "ENOENT"

    ) {

      throw error;

    }

  }



  entries.push(

    entry

  );



  await fs.writeFile(

    filePath,

    JSON.stringify(

      entries,

      null,

      2

    ),

    "utf8"

  );

}



/* =========================

   BASIC CLEANUP HELPER

\========================= */

function clean(value) {

  return String(

    value || ""

  )

    .trim();

}



function isValidEmail(value) {

  const email =

    clean(value);



  return (

    email.length <= 254 &&

    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(

      email

    )

  );

}



function isTooLong(

  value,

  maxLength

) {

  return (

    clean(value).length >

    maxLength

  );

}



function hasOversizedAvailability(

  availability

) {

  if (!Array.isArray(availability)) {

    return false;

  }



  if (availability.length > 10) {

    return true;

  }



  return availability.some(

    item =>

      clean(item).length > 50

  );

}



function escapeEmailHtml(value) {

  return String(

    value || ""

  )

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");

}



function emailValue(value) {

  const cleaned =

    clean(value);

  return cleaned

    ? escapeEmailHtml(cleaned)

    : "Not provided";

}



function emailMultiline(value) {

  const cleaned =

    clean(value);

  return cleaned

    ? escapeEmailHtml(cleaned)

        .replaceAll(

          "\n",

          "<br>"

        )

    : "Not provided";

}



function buildEmailTemplate({

  badge,

  title,

  subtitle,

  sections,

  replyLabel

}) {

  const sectionHtml =

    sections

      .map(section => {

        const rows =

          section.rows

            .map(row => `

              <tr>

                <td

                  style="

                    padding: 8px 12px 8px 0;

                    color: #627286;

                    font-size: 13px;

                    font-weight: 700;

                    vertical-align: top;

                    width: 34%;

                  "

                >

                  ${escapeEmailHtml(row.label)}

                </td>

                <td

                  style="

                    padding: 8px 0;

                    color: #1f2937;

                    font-size: 14px;

                    line-height: 1.55;

                    vertical-align: top;

                  "

                >

                  ${row.value}

                </td>

              </tr>

            `)

            .join("");

        return `

          <div

            style="

              margin-top: 24px;

              padding: 22px;

              background: #ffffff;

              border: 1px solid #e4eaf0;

              border-radius: 12px;

            "

          >

            <div

              style="

                margin-bottom: 10px;

                color: #123b73;

                font-size: 16px;

                font-weight: 800;

              "

            >

              ${escapeEmailHtml(section.title)}

            </div>

            <table

              role="presentation"

              width="100%"

              cellspacing="0"

              cellpadding="0"

              style="border-collapse: collapse;"

            >

              ${rows}

            </table>

          </div>

        `;

      })

      .join("");

  return `

<!doctype html>

<html>

  <body

    style="

      margin: 0;

      padding: 0;

      background: #f3f6f9;

      font-family: Arial, Helvetica, sans-serif;

      color: #1f2937;

    "

  >

    <table

      role="presentation"

      width="100%"

      cellspacing="0"

      cellpadding="0"

      style="background: #f3f6f9; padding: 28px 14px;"

    >

      <tr>

        <td align="center">

          <table

            role="presentation"

            width="100%"

            cellspacing="0"

            cellpadding="0"

            style="

              max-width: 680px;

              background: #ffffff;

              border-radius: 16px;

              overflow: hidden;

              box-shadow: 0 10px 30px rgba(15, 42, 67, 0.08);

            "

          >

            <tr>

              <td

                style="

                  padding: 26px 30px;

                  background: #0b4fa3;

                  border-top: 5px solid #00a94f;

                "

              >

                <div

                  style="

                    color: #ffffff;

                    font-size: 22px;

                    font-weight: 800;

                    line-height: 1.2;

                  "

                >

                  All Over Janitorial Services

                </div>

                <div

                  style="

                    margin-top: 7px;

                    color: rgba(255,255,255,0.78);

                    font-size: 13px;

                  "

                >

                  Website Notification

                </div>

              </td>

            </tr>

            <tr>

              <td style="padding: 30px;">

                <div

                  style="

                    display: inline-block;

                    padding: 6px 10px;

                    background: #eaf8ef;

                    color: #087a3b;

                    border-radius: 999px;

                    font-size: 12px;

                    font-weight: 800;

                    letter-spacing: 0.04em;

                    text-transform: uppercase;

                  "

                >

                  ${escapeEmailHtml(badge)}

                </div>

                <h1

                  style="

                    margin: 14px 0 8px;

                    color: #102a43;

                    font-size: 27px;

                    line-height: 1.2;

                  "

                >

                  ${escapeEmailHtml(title)}

                </h1>

                <p

                  style="

                    margin: 0;

                    color: #627286;

                    font-size: 14px;

                    line-height: 1.65;

                  "

                >

                  ${escapeEmailHtml(subtitle)}

                </p>

                ${sectionHtml}

                <div

                  style="

                    margin-top: 24px;

                    padding: 16px 18px;

                    background: #eef5fd;

                    border-left: 4px solid #0b4fa3;

                    border-radius: 0 10px 10px 0;

                    color: #334e68;

                    font-size: 13px;

                    line-height: 1.6;

                  "

                >

                  ${escapeEmailHtml(replyLabel)}

                </div>

              </td>

            </tr>

            <tr>

              <td

                style="

                  padding: 18px 30px;

                  background: #0b1f33;

                  color: rgba(255,255,255,0.72);

                  font-size: 12px;

                  line-height: 1.5;

                "

              >

                All Over Janitorial Services, Inc.<br>

                3005 Mill St · Mobile, AL 36607

              </td>

            </tr>

          </table>

        </td>

      </tr>

    </table>

  </body>

</html>

  `.trim();

}



/* =========================

   CLOUDFLARE TURNSTILE

\========================= */

async function verifyTurnstile(

  token,

  remoteIp

) {

  if (

    !process.env.TURNSTILE_SECRET_KEY

  ) {

    throw new Error(

      "TURNSTILE_SECRET_KEY is missing."

    );

  }



  if (!token) {

    return false;

  }



  const body =

    new URLSearchParams();



  body.append(

    "secret",

    process.env.TURNSTILE_SECRET_KEY

  );



  body.append(

    "response",

    token

  );



  if (remoteIp) {

    body.append(

      "remoteip",

      remoteIp

    );

  }



  const response =

    await fetch(

      "https://challenges.cloudflare.com/turnstile/v0/siteverify",

      {

        method:

          "POST",

        headers: {

          "Content-Type":

            "application/x-www-form-urlencoded"

        },

        body:

          body.toString()

      }

    );



  if (!response.ok) {

    throw new Error(

      "Turnstile verification service returned an error."

    );

  }



  const result =

    await response.json();



  return result.success === true;

}



/* =========================

   CANONICAL HOST REDIRECT

\========================= */

app.use(

  (req, res, next) => {

    if (

      req.hostname ===

      "aojsinc.us"

    ) {

      return res.redirect(

        301,

        `https://www.aojsinc.us${req.originalUrl}`

      );

    }



    next();

  }

);



/* =========================

   EXPRESS SETUP

\========================= */

/* =========================

   HELMET SECURITY HEADERS

\========================= */

/*

  Keep Helmet's safe general headers enabled.

  CSP, HSTS, COEP, and CORP are disabled here for the

  current local + Cloudflare Tunnel setup so Helmet does

  not interfere with localhost, Turnstile, Google Maps,

  Google review/profile images, or other existing assets.

  We can build a strict production CSP after the site is

  moved to AWS and the permanent domain is finalized.

*/

app.use(

  helmet({

    contentSecurityPolicy:

      false,

    strictTransportSecurity:

      false,

    crossOriginEmbedderPolicy:

      false,

    crossOriginResourcePolicy:

      false

  })

);





app.use(

  (req, res, next) => {

    res.setHeader(

      "X-Content-Type-Options",

      "nosniff"

    );

    res.setHeader(

      "Referrer-Policy",

      "strict-origin-when-cross-origin"

    );

    res.setHeader(

      "X-Frame-Options",

      "SAMEORIGIN"

    );

    res.setHeader(

      "Permissions-Policy",

      "geolocation=(), microphone=(), camera=()"

    );

    next();

  }

);



app.use(

  (req, res, next) => {

    /*

      Keep terminal logs readable by

      ignoring common browser asset requests.

    */

    const ignoredExtensions = [

      ".css",

      ".js",

      ".png",

      ".jpg",

      ".jpeg",

      ".webp",

      ".svg",

      ".ico",

      ".woff",

      ".woff2",

      ".map"

    ];



    const lowerPath =

      req.path.toLowerCase();



    const isAsset =

      ignoredExtensions.some(

        extension =>

          lowerPath.endsWith(

            extension

          )

      );



    if (!isAsset) {

      const device =

        identifyDevice(

          req.headers[

            "user-agent"

          ]

        );



      const ip =

        getVisitorIp(req);



      console.log(

        `[VISITOR] ${formatRequestTime()} | ${ip} | ${device} | ${req.method} ${req.originalUrl}`

      );

    }



    next();

  }

);



app.use(

  express.json({

    limit: "100kb"

  })

);



/* =========================

   GLOBAL RATE LIMITING

\========================= */

/*

  Limits general page/API probing without counting normal

  CSS, JavaScript, image, font, or favicon requests.

*/

const globalLimiter =

  rateLimit({

    windowMs:

      15 * 60 * 1000,

    limit:

      120,

    standardHeaders:

      "draft-7",

    legacyHeaders:

      false,

    keyGenerator:

      req =>

        getVisitorIp(req),

    skip:

      req => {

        const lowerPath =

          req.path.toLowerCase();

        const ignoredExtensions = [

          ".css",

          ".js",

          ".png",

          ".jpg",

          ".jpeg",

          ".webp",

          ".svg",

          ".ico",

          ".woff",

          ".woff2",

          ".map"

        ];

        return (

          req.method === "OPTIONS" ||

          ignoredExtensions.some(

            extension =>

              lowerPath.endsWith(

                extension

              )

          )

        );

      },

    message: {

      error:

        "Too many requests. Please wait a few minutes and try again."

    }

  });



app.use(

  globalLimiter

);



/* =========================

   GOOGLE REVIEWS RATE LIMITING

\========================= */

const reviewsLimiter =

  rateLimit({

    windowMs:

      60 * 1000,

    limit:

      30,

    standardHeaders:

      "draft-7",

    legacyHeaders:

      false,

    keyGenerator:

      req =>

        getVisitorIp(req),

    message: {

      error:

        "Too many review requests. Please try again shortly."

    }

  });



app.use(

  "/api/reviews",

  reviewsLimiter

);



/* =========================

   FORM RATE LIMITING

\========================= */

const formLimiter =

  rateLimit({

    windowMs:

      15 * 60 * 1000,

    limit:

      10,

    standardHeaders:

      "draft-7",

    legacyHeaders:

      false,

    keyGenerator:

      req =>

        getVisitorIp(req),

    message: {

      error:

        "Too many form submissions. Please wait a few minutes and try again."

    }

  });



app.use(

  [

    "/api/contact",

    "/api/quote",

    "/api/careers"

  ],

  formLimiter

);



/*

  Prevent private server files and

  directories from being publicly accessed.

*/

app.use(

  (req, res, next) => {

    const requestPath =

      req.path.toLowerCase();



    const blocked =

      requestPath === "/.env" ||

      requestPath === "/server.js" ||

      requestPath === "/package.json" ||

      requestPath === "/package-lock.json" ||

      requestPath === "/storage" ||

      requestPath.startsWith(

        "/storage/"

      ) ||

      requestPath === "/node_modules" ||

      requestPath.startsWith(

        "/node_modules/"

      );



    if (blocked) {

      return res

        .status(404)

        .sendFile(

          path.join(

            __dirname,

            "404.html"

          )

        );

    }



    next();

  }

);



/*

  Serve website files.

*/

app.use(

  express.static(

    path.join(__dirname)

  )

);



/* =========================

   GOOGLE REVIEWS

\========================= */

app.get(

  "/api/reviews",

  async (req, res) => {

    try {

      const now =

        Date.now();



      /*

        Serve cached reviews if

        they're less than 7 days old.

      */

      if (

        reviewCache &&

        now -

          reviewCacheTimestamp

          <

          REVIEW_CACHE_DURATION

      ) {

        console.log(

          "Serving Google reviews from cache."

        );



        return res.json(

          reviewCache

        );

      }



      console.log(

        "Fetching fresh Google reviews..."

      );



      const url =

        `https://places.googleapis.com/v1/places/${PLACE_ID}`;



      const response =

        await fetch(

          url,

          {

            method: "GET",

            headers: {

              "X-Goog-Api-Key":

                process.env

                  .GOOGLE_PLACES_API_KEY,

              "X-Goog-FieldMask":

                "displayName,rating,userRatingCount,reviews,googleMapsUri"

            }

          }

        );



      if (!response.ok) {

        const errorData =

          await response.text();



        console.error(

          "Google Places API Error:"

        );



        console.error(

          errorData

        );



        return res

          .status(500)

          .json({

            error:

              "Unable to retrieve Google reviews."

          });

      }



      const data =

        await response.json();



      const reviews =

        (data.reviews || [])

          .filter(

            review =>

              review.rating >= 4

          )

          .slice(

            0,

            3

          )

          .map(

            review => ({

              name:

                review

                  .authorAttribution

                  ?.displayName ||

                "Google Reviewer",

              profilePhoto:

                review

                  .authorAttribution

                  ?.photoUri ||

                null,

              rating:

                review.rating,

              text:

                review

                  .text

                  ?.text ||

                ""

            })

          );



      const reviewData = {

        businessName:

          data

            .displayName

            ?.text ||

          "All Over Janitorial Services",

        rating:

          data.rating ||

          null,

        reviewCount:

          data.userRatingCount ||

          0,

        googleMapsUrl:

          data.googleMapsUri ||

          null,

        reviews:

          reviews

      };



      reviewCache =

        reviewData;



      reviewCacheTimestamp =

        now;



      res.json(

        reviewData

      );



    } catch (error) {

      console.error(

        error

      );



      if (reviewCache) {

        console.log(

          "Google request failed. Serving stale cache."

        );



        return res.json(

          reviewCache

        );

      }



      res

        .status(500)

        .json({

          error:

            "Server error while retrieving reviews."

        });

    }

  }

);



/* =========================

   CAREER APPLICATION

\========================= */

app.post(

  "/api/careers",

  async (req, res) => {

    try {

      const {

        name,

        phone,

        email,

        address,

        cityState,

        availability,

        startDate,

        previousCompany,

        previousCompanyPhone,

        previousSupervisor,

        stillEmployed,

        experience,

        referenceOne,

        referenceOnePhone,

        referenceTwo,

        referenceTwoPhone,

        message,

        turnstileToken

      } =

        req.body;



      const turnstileValid =

        await verifyTurnstile(

          clean(turnstileToken),

          getVisitorIp(req)

        );



      if (!turnstileValid) {

        return res

          .status(400)

          .json({

            error:

              "CAPTCHA verification failed. Please try again."

          });

      }



      if (

        !name ||

        !phone ||

        !email ||

        !address ||

        !cityState ||

        !experience

      ) {

        return res

          .status(400)

          .json({

            error:

              "Please complete all required fields."

          });

      }



      if (!isValidEmail(email)) {

        return res

          .status(400)

          .json({

            error:

              "Please enter a valid email address."

          });

      }



      if (

        isTooLong(name, 100) ||

        isTooLong(phone, 40) ||

        isTooLong(email, 254) ||

        isTooLong(address, 200) ||

        isTooLong(cityState, 120) ||

        isTooLong(startDate, 40) ||

        isTooLong(previousCompany, 150) ||

        isTooLong(previousCompanyPhone, 40) ||

        isTooLong(previousSupervisor, 100) ||

        isTooLong(stillEmployed, 20) ||

        isTooLong(experience, 5000) ||

        isTooLong(referenceOne, 100) ||

        isTooLong(referenceOnePhone, 40) ||

        isTooLong(referenceTwo, 100) ||

        isTooLong(referenceTwoPhone, 40) ||

        isTooLong(message, 5000) ||

        hasOversizedAvailability(

          availability

        )

      ) {

        return res

          .status(400)

          .json({

            error:

              "One or more fields are too long."

          });

      }



      const application = {

        submittedAt:

          new Date()

            .toISOString(),

        name:

          clean(name),

        phone:

          clean(phone),

        email:

          clean(email),

        address:

          clean(address),

        cityState:

          clean(cityState),

        availability:

          Array.isArray(

            availability

          )

            ? availability.map(clean)

            : [],

        startDate:

          clean(startDate),

        previousCompany:

          clean(previousCompany),

        previousCompanyPhone:

          clean(previousCompanyPhone),

        previousSupervisor:

          clean(previousSupervisor),

        stillEmployed:

          clean(stillEmployed),

        experience:

          clean(experience),

        referenceOne:

          clean(referenceOne),

        referenceOnePhone:

          clean(referenceOnePhone),

        referenceTwo:

          clean(referenceTwo),

        referenceTwoPhone:

          clean(referenceTwoPhone),

        message:

          clean(message)

      };



      await appendToJsonFile(

        CAREER_FILE,

        application

      );



      const emailText = `

NEW CAREER APPLICATION

Name: ${application.name}

Phone: ${application.phone}

Email: ${application.email}

Address: ${application.address}

City / State / ZIP: ${application.cityState}

Availability:

${application.availability.join(", ") || "Not provided"}

Earliest Start Date:

${application.startDate || "Not provided"}

PREVIOUS EMPLOYMENT

Company Name:

${application.previousCompany || "Not provided"}

Company Phone:

${application.previousCompanyPhone || "Not provided"}

Supervisor:

${application.previousSupervisor || "Not provided"}

Still Employed There:

${application.stillEmployed || "Not provided"}

Previous Work / Cleaning Experience:

${application.experience}

REFERENCES

Reference #1:

${application.referenceOne || "Not provided"}

${application.referenceOnePhone || ""}

Reference #2:

${application.referenceTwo || "Not provided"}

${application.referenceTwoPhone || ""}

Additional Information:

${application.message || "None"}

      `.trim();



      const emailHtml =

        buildEmailTemplate({

          badge:

            "Career Application",

          title:

            `New Career Application - ${application.name}`,

          subtitle:

            "A new employment application was submitted through the All Over Janitorial Services website.",

          sections: [

            {

              title: "Applicant Information",

              rows: [

                { label: "Name", value: emailValue(application.name) },

                { label: "Phone", value: emailValue(application.phone) },

                { label: "Email", value: emailValue(application.email) },

                { label: "Address", value: emailValue(application.address) },

                { label: "City / State / ZIP", value: emailValue(application.cityState) },

                { label: "Availability", value: emailValue(application.availability.join(", ")) },

                { label: "Earliest Start Date", value: emailValue(application.startDate) }

              ]

            },

            {

              title: "Previous Employment",

              rows: [

                { label: "Company Name", value: emailValue(application.previousCompany) },

                { label: "Company Phone", value: emailValue(application.previousCompanyPhone) },

                { label: "Supervisor", value: emailValue(application.previousSupervisor) },

                { label: "Still Employed There", value: emailValue(application.stillEmployed) },

                { label: "Experience", value: emailMultiline(application.experience) }

              ]

            },

            {

              title: "References",

              rows: [

                {

                  label: "Reference #1",

                  value: `${emailValue(application.referenceOne)}<br>${emailValue(application.referenceOnePhone)}`

                },

                {

                  label: "Reference #2",

                  value: `${emailValue(application.referenceTwo)}<br>${emailValue(application.referenceTwoPhone)}`

                }

              ]

            },

            {

              title: "Additional Information",

              rows: [

                { label: "Message", value: emailMultiline(application.message) }

              ]

            }

          ],

          replyLabel:

            `Reply to this email to contact ${application.name}.`

        });



      const emailResult =

        await sendFormEmail({

          subject:

            `New Career Application - ${application.name}`,

          text:

            emailText,

          html:

            emailHtml,

          replyTo:

            application.email

        });



      console.log(

        `Career application received from ${application.name}`

      );



      res.json({

        success: true,

        emailSent:

          emailResult.sent

      });



    } catch (error) {

      console.error(

        "Career application error:",

        error

      );



      res

        .status(500)

        .json({

          error:

            "Unable to submit application."

        });

    }

  }

);



/* =========================

   CONTACT FORM

\========================= */

app.post(

  "/api/contact",

  async (req, res) => {

    try {

      const {

        name,

        phone,

        email,

        message,

        turnstileToken

      } =

        req.body;



      const turnstileValid =

        await verifyTurnstile(

          clean(turnstileToken),

          getVisitorIp(req)

        );



      if (!turnstileValid) {

        return res

          .status(400)

          .json({

            error:

              "CAPTCHA verification failed. Please try again."

          });

      }



      if (

        !name ||

        !phone ||

        !email ||

        !message

      ) {

        return res

          .status(400)

          .json({

            error:

              "Please complete all required fields."

          });

      }



      if (!isValidEmail(email)) {

        return res

          .status(400)

          .json({

            error:

              "Please enter a valid email address."

          });

      }



      if (

        isTooLong(name, 100) ||

        isTooLong(phone, 40) ||

        isTooLong(email, 254) ||

        isTooLong(message, 5000)

      ) {

        return res

          .status(400)

          .json({

            error:

              "One or more fields are too long."

          });

      }



      const contactMessage = {

        submittedAt:

          new Date()

            .toISOString(),

        name:

          clean(name),

        phone:

          clean(phone),

        email:

          clean(email),

        message:

          clean(message)

      };



      await appendToJsonFile(

        CONTACT_FILE,

        contactMessage

      );



      const emailText = `

NEW CONTACT MESSAGE

Name: ${contactMessage.name}

Phone: ${contactMessage.phone}

Email: ${contactMessage.email}

Message:

${contactMessage.message}

      `.trim();



      const emailHtml =

        buildEmailTemplate({

          badge:

            "Contact Message",

          title:

            `New Contact Message - ${contactMessage.name}`,

          subtitle:

            "A new customer message was submitted through the All Over Janitorial Services website.",

          sections: [

            {

              title: "Contact Information",

              rows: [

                { label: "Name", value: emailValue(contactMessage.name) },

                { label: "Phone", value: emailValue(contactMessage.phone) },

                { label: "Email", value: emailValue(contactMessage.email) }

              ]

            },

            {

              title: "Message",

              rows: [

                { label: "Details", value: emailMultiline(contactMessage.message) }

              ]

            }

          ],

          replyLabel:

            `Reply to this email to contact ${contactMessage.name}.`

        });



      const emailResult =

        await sendFormEmail({

          subject:

            `New Contact Message - ${contactMessage.name}`,

          text:

            emailText,

          html:

            emailHtml,

          replyTo:

            contactMessage.email

        });



      console.log(

        `Contact message received from ${contactMessage.name}`

      );



      res.json({

        success: true,

        emailSent:

          emailResult.sent

      });



    } catch (error) {

      console.error(

        "Contact form error:",

        error

      );



      res

        .status(500)

        .json({

          error:

            "Unable to submit contact message."

        });

    }

  }

);



/* =========================

   QUOTE FORM

\========================= */

app.post(

  "/api/quote",

  async (req, res) => {

    try {

      const {

        firstName,

        lastName,

        company,

        email,

        phone,

        address,

        addressTwo,

        city,

        state,

        zip,

        squareFeet,

        service,

        frequency,

        cleaningTime,

        startDate,

        details,

        additional,

        turnstileToken

      } =

        req.body;



      const turnstileValid =

        await verifyTurnstile(

          clean(turnstileToken),

          getVisitorIp(req)

        );



      if (!turnstileValid) {

        return res

          .status(400)

          .json({

            error:

              "CAPTCHA verification failed. Please try again."

          });

      }



      if (

        !firstName ||

        !lastName ||

        !company ||

        !email ||

        !phone ||

        !address ||

        !city ||

        !state ||

        !zip ||

        !service ||

        !details

      ) {

        return res

          .status(400)

          .json({

            error:

              "Please complete all required fields."

          });

      }



      if (!isValidEmail(email)) {

        return res

          .status(400)

          .json({

            error:

              "Please enter a valid email address."

          });

      }



      if (

        isTooLong(firstName, 100) ||

        isTooLong(lastName, 100) ||

        isTooLong(company, 150) ||

        isTooLong(email, 254) ||

        isTooLong(phone, 40) ||

        isTooLong(address, 200) ||

        isTooLong(addressTwo, 200) ||

        isTooLong(city, 100) ||

        isTooLong(state, 50) ||

        isTooLong(zip, 20) ||

        isTooLong(squareFeet, 40) ||

        isTooLong(service, 100) ||

        isTooLong(frequency, 50) ||

        isTooLong(cleaningTime, 50) ||

        isTooLong(startDate, 40) ||

        isTooLong(details, 5000) ||

        isTooLong(additional, 5000)

      ) {

        return res

          .status(400)

          .json({

            error:

              "One or more fields are too long."

          });

      }



      const quoteRequest = {

        submittedAt:

          new Date()

            .toISOString(),

        firstName:

          clean(firstName),

        lastName:

          clean(lastName),

        company:

          clean(company),

        email:

          clean(email),

        phone:

          clean(phone),

        address:

          clean(address),

        addressTwo:

          clean(addressTwo),

        city:

          clean(city),

        state:

          clean(state),

        zip:

          clean(zip),

        squareFeet:

          clean(squareFeet),

        service:

          clean(service),

        frequency:

          clean(frequency),

        cleaningTime:

          clean(cleaningTime),

        startDate:

          clean(startDate),

        details:

          clean(details),

        additional:

          clean(additional)

      };



      await appendToJsonFile(

        QUOTE_FILE,

        quoteRequest

      );



      const fullName =

        `${quoteRequest.firstName} ${quoteRequest.lastName}`;



      const fullAddress = [

        quoteRequest.address,

        quoteRequest.addressTwo,

        `${quoteRequest.city}, ${quoteRequest.state} ${quoteRequest.zip}`

      ]

        .filter(Boolean)

        .join("\n");



      const emailText = `

NEW QUOTE REQUEST

Contact:

${fullName}

Company:

${quoteRequest.company}

Email:

${quoteRequest.email}

Phone:

${quoteRequest.phone}

SERVICE LOCATION

${fullAddress}

Approximate Square Footage:

${quoteRequest.squareFeet || "Not provided"}

CLEANING NEEDS

Service Requested:

${quoteRequest.service}

Preferred Frequency:

${quoteRequest.frequency || "Not provided"}

Preferred Cleaning Time:

${quoteRequest.cleaningTime || "Not provided"}

Desired Start Date:

${quoteRequest.startDate || "Not provided"}

What They Would Like Quoted:

${quoteRequest.details}

Additional Information:

${quoteRequest.additional || "None"}

      `.trim();



      const emailHtml =

        buildEmailTemplate({

          badge:

            "Quote Request",

          title:

            `New Quote Request - ${quoteRequest.company}`,

          subtitle:

            "A new cleaning quote request was submitted through the All Over Janitorial Services website.",

          sections: [

            {

              title: "Customer Information",

              rows: [

                { label: "Contact", value: emailValue(fullName) },

                { label: "Company", value: emailValue(quoteRequest.company) },

                { label: "Email", value: emailValue(quoteRequest.email) },

                { label: "Phone", value: emailValue(quoteRequest.phone) }

              ]

            },

            {

              title: "Service Location",

              rows: [

                { label: "Address", value: emailMultiline(fullAddress) },

                { label: "Approx. Square Footage", value: emailValue(quoteRequest.squareFeet) }

              ]

            },

            {

              title: "Cleaning Needs",

              rows: [

                { label: "Service Requested", value: emailValue(quoteRequest.service) },

                { label: "Preferred Frequency", value: emailValue(quoteRequest.frequency) },

                { label: "Preferred Cleaning Time", value: emailValue(quoteRequest.cleaningTime) },

                { label: "Desired Start Date", value: emailValue(quoteRequest.startDate) },

                { label: "Quote Details", value: emailMultiline(quoteRequest.details) },

                { label: "Additional Information", value: emailMultiline(quoteRequest.additional) }

              ]

            }

          ],

          replyLabel:

            `Reply to this email to contact ${fullName}.`

        });



      const emailResult =

        await sendFormEmail({

          subject:

            `New Quote Request - ${quoteRequest.company}`,

          text:

            emailText,

          html:

            emailHtml,

          replyTo:

            quoteRequest.email

        });



      console.log(

        `Quote request received from ${quoteRequest.company}`

      );



      res.json({

        success: true,

        emailSent:

          emailResult.sent

      });



    } catch (error) {

      console.error(

        "Quote form error:",

        error

      );



      res

        .status(500)

        .json({

          error:

            "Unable to submit quote request."

        });

    }

  }

);



/* =========================

   NOT FOUND

\========================= */

app.use(

  (req, res) => {

    res

      .status(404)

      .sendFile(

        path.join(

          __dirname,

          "404.html"

        )

      );

  }

);



/* =========================

   START SERVER

\========================= */

app.listen(

  PORT,

  () => {

    console.log(

      `All Over Janitorial website running at http://localhost:${PORT}`

    );

  }

);