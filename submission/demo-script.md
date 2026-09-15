# Looplight demo recording kit

**Presenter:** Shivam Gupta, founder and builder  
**Target length:** about 3 minutes, at a measured 135-145 words per minute  
**Format:** 16:9 screen recording, 1920 × 1080 or higher, with your own narration  
**Cast:** Anita and Maya are fictional. All demonstration records are synthetic.

## Verbatim voiceover

Hi, I'm Shivam Gupta, and this is Looplight.

Anita has just left the hospital. Her daughter Maya has the discharge document. But a result is still pending, another test needs follow-up, and someone needs to track what happens next. Anita and Maya are fictional. The coordination problem is real.

Looplight turns the instructions in a discharge document into a follow-up ledger. Every confirmed action keeps its source, the person tracking it, and a record of what happened.

Let's follow Anita's example. I open the sample document and run the analysis. A small trained text model works with explicit rules to suggest follow-up items. It runs without a paid model API.

The review screen is the important part. I can see the exact sentence behind each suggestion. I review the whole document, including sentences the system did not turn into tasks. I can correct a suggestion or add something it missed.

Dates remain connected to the original wording. If the document is unclear, Looplight leaves a question for the care team. It does not invent a clinical deadline.

I confirm the follow-up and give Maya responsibility for tracking one action. That records who is following up. It does not mean Maya is the clinician responsible for treatment.

Now a result has arrived. Watch what happens when I record that. The result can be received while clinician review remains outstanding. A file arriving is only one step. I record the separate report of clinician review and the outcome before closing the loop. The history shows what the user reported, rather than presenting it as independently verified medical evidence.

The plan can also leave the app. I can print a brief for the next conversation, export calendar reminders, or download the structured record. In a signed-in care space, plans are saved to the account.

For the first customer, I would test this with a primary-care or transitions coordinator who already chases discharge follow-up. The initial pricing hypothesis is one hundred and forty-nine dollars per month for one hundred care episodes. The pilot must show whether staff time saved justifies that price.

This is a working MVP with synthetic evaluation, not a clinically validated product. The model's raw five-category accuracy was eighty-two percent on fifty separate synthetic challenge examples. It abstained on forty-four, so human review remains central.

The next step is a supervised pilot that measures omissions and preparation time. I built Looplight with AI-assisted development. The goal is simple: every next step has a source, a person, and a recorded ending.

## Shot list

Record the real application. Do not use slide mockups as evidence that a feature works. The timing below is approximate. Let the voiceover determine the final cuts.

| Time | Screen action | Narration cue |
|---|---|---|
| 0:00-0:09 | Hold on the Looplight opening screen. Keep the project name readable. | “Hi, I'm Shivam Gupta…” |
| 0:09-0:27 | Choose Add discharge notes, then Anita’s discharge. Pause on the fictional-data label and discharge text. | “Anita has just left…” |
| 0:27-0:44 | Choose Find the open loops. Show the resulting care board and Needs review state. | “Let's follow Anita's example…” |
| 0:44-1:04 | Open a suggestion with Check details. Show its source sentence, then open the full sentence review. Demonstrate one correction. | “The review screen…” |
| 1:04-1:17 | Show a date or date window and its original phrase. Show the unresolved question for an unspecified detail. | “Dates remain connected…” |
| 1:17-1:31 | In Who will keep track of this?, set Maya as the tracker. Choose Confirm this follow-up. | “I confirm the follow-up…” |
| 1:31-1:59 | Choose Record progress, then Record result received. Show that review remains outstanding. Enter the fictional clinician name, note, and confirmation, then choose Record completion. Show history. | “Now a result has arrived…” |
| 1:59-2:13 | Open Visit brief for printing. Return and show Calendar file. Show JSON export in the account. Cut to the saved account view only after real sign-in has succeeded. | “The plan can also leave…” |
| 2:13-2:33 | Show the business/pilot slide or a steady product view. | “For the first customer…” |
| 2:33-2:50 | Show the model evidence screen or slide with the full synthetic-data caveat and abstention count. | “This is a working MVP…” |
| 2:50-3:07 | Return to the final plan and hold for the closing line. | “The next step…” |

## Before recording

1. Use only fictional data. Reset the demo and check that the sample is Anita/Maya.
2. Rehearse one complete run. The confirmed labels are Check details, Confirm this follow-up, Record progress, Record result received, Record completion, Visit brief, and Calendar file. JSON export appears in the account.
3. Sign in before the take if sign-in would reveal personal account information. Create or import a plan inside a signed-in care space, then record a short separate clip showing it returns after refresh. Anonymous demo edits do not transfer when signing in.
4. Close other tabs and notifications. Increase browser zoom until source text is readable in the video. Keep the cursor still while explaining a sentence.
5. Record narration in a quiet room. Speak the voiceover exactly, with a short pause after “The review screen is the important part” and before recording closure.
6. Read the numbers from the final model report. If the final model changes, update both the spoken metrics and the displayed slide. The current script uses 82% raw accuracy on 50 separate synthetic cases and 44 abstentions.

## Assembly and submission

Use simple cuts. Keep actual clicks visible. Small on-screen captions such as “Synthetic example” and “User-reported review” can clarify the demonstration. Music is optional and should remain below the narration.

Upload the finished video to YouTube, Vimeo, or Youku using settings that let judges view and embed it. Devpost's video field supports those hosts. Test playback from a signed-out browser. No event-specific video duration limit was found in the public rules; the three-minute target is an editorial choice.

The final publication still requires Shivam's spoken recording, a viewable hosted video link, and truthful eligibility/account declarations. A separate silent screenshot walkthrough is included. The narrated interaction demo still needs to be recorded and uploaded.

Source: [Devpost video upload documentation](https://help.devpost.com/article/85-uploading-a-demo-video).
