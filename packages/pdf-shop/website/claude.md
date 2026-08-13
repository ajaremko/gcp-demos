## PDF Shop Website

This is a website that allows a user to input a specification for a document they wish to generate. Lets imagine its a legal contract. Once the user has submitted the specification, they are given a payment session token and redirected to a payment page. Once they have paid for their document via stripe integration, they are directed to a page where they can download their pdf.

The purpose of this site is to serve as a technical demo. It should use a sandbox stripe account but will be deployed to a live site behind a simple login page from envoy. This app will be containerized and deployed on google cloud run.

### Desired Technology stack

#### styled components

for styling visually appealing but basic react components

#### react hook form

for implementing forms with validation, helper text, error state, loading state, etc

#### zod

for validating form input client side and parsing request bodies server side

#### next server actions

for handling form submission server side

#### filesystem

for persisting document specs and payment verification data

### Pages

#### Landing Page

A simple landing page informing the user that this is a demo pdf shop. Provide a call to action to navigate to the document specification page

#### Document Specification Page

This page should display a form for providing document specifications. The specifications should include a dropdown picker for light/dark color schema, a text input for title and a text area for body text. When the user submits the form, the backend should save their specification to a json file and redirect the user to the payment page with the created id as a url parameter

#### Payment Page

This page should display a custom stripe payment form. This is a one-time digital download. The stripe account will be a sandbox account so a dummy card number can be used. Provide a list of valid dummy card numbers. The document specification id must be present in the url parameters so that when the payment information is passed to our backend and we charge the card with stripe, we can save another json file associating the document specification id with a payment confirmation id. If the payment is successful we should redirect the user to the download page with the id again passed as a url parameter

#### Download Page

Finally, the user can access their document. In another application, the document is being processed by an event triggered by the specification file being written. When the document is available, we can present a download button. To determine if the document is ready, we'll look for the presence of a particular file in the filesystem - something like `tmp/generated-documents/document-spec-id.json`. The json document contains a boolean for if the document is paid for and a nullable pointer object to the generated pdf in the filesystem. If the document is available and paid for, we can display the download button.

### Configuration

The root directory that the server should use for saving and reading files should be configurable via and environment variable. After that, it should own the names of the directories it writes to.
The stripe api key(s) required should be configured via environment variable(s).
