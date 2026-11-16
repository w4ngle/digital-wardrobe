# ML system card

## Objective

Recommend complete outfits from a user's own wardrobe under hard constraints (availability, activity, weather and required items) while gradually adapting to explicit feedback.

This is a decision-support system, not a fashion “ground truth” model. Style preference is subjective and changes with context, so the architecture separates constraints from preference ranking.

## Inputs and outputs

Inputs include item images and confirmed metadata, occasion, weather, transport, an optional required item, availability, wear history and explicit feedback. The output is up to three outfits with selected item IDs and a short explanation.

## Hybrid inference

### Vision extraction

Gemini or OpenAI Vision maps a photo to category, color, season, style, warmth, formality, description and confidence. Zod rejects malformed output. The user can edit every prediction before saving it.

### Deterministic ranker

The local ranker generates structurally valid candidates, scores feature compatibility and applies hard exclusions. It remains available when no AI key exists or model output fails validation.

### LLM recommendation

The model receives a compact numbered catalog instead of database UUIDs. Returned numbers are checked for range and duplicates, resolved to real items, then validated. Invalid output is retried at most twice with validation feedback before falling back to rules.

## Validation constraints

- available items only;
- top + bottom or a one-piece garment;
- shoes for non-beach outfits;
- no duplicate primary category;
- outerwear in cold conditions;
- no warm everyday layers in beach outfits;
- training clothes must be sporty or explicitly marked training-suitable;
- mandatory item must be present;
- snoozed items cannot reappear through replacement.

## Personalization

Current personalization is intentionally interpretable. Positive ratings add weight to outfit items, negative ratings record rejected combinations, comfort/confidence affect scores, and “rediscover” raises long-unused items.

This is not called a trained recommender yet: the available single-user feedback is too small and too biased for a defensible learned model.

## Evaluation

`npm run test:eval` runs a synthetic constraint suite. It checks safety and logic invariants, not subjective style quality.

Future metrics after anonymized data collection: constraint pass rate, acceptance@1/3, item coverage, intra-list diversity, replacement rate, fallback rate, retry count and vision-field correction rate. A temporal split should prevent future preference leakage. Model and prompt versions should be logged with each prediction.

## Risks and limitations

- Feedback comes from very few users and is not representative.
- Likes are exposure-biased: unseen items cannot receive feedback.
- Weather classes simplify wind, humidity and indoor conditions.
- Product photos do not fully represent fit on a person.
- LLM explanations are generated text, not causal explanations.
- Demo fixtures must never be reported as real-world accuracy.

## Responsible data handling

Wardrobe photos may reveal personal style, location context or body-related information. The public repository contains no real user photos, Telegram IDs or production keys. Any future research dataset should require consent, anonymization, deletion support and a documented retention period.
