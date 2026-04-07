# Stripe Payment Integration, Photo Upload, and Push Notifications
# Add these to your backend server.py

# At the top with other imports:
# stripe (already imported)

# After load_dotenv():
# Initialize Stripe (use test key for development)
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_51...")  # Add your Stripe secret key to .env

# Add these endpoints after the subscription routes:

@api_router.post("/payment/create-checkout-session")
async def create_checkout_session(request: Request, payment_data: Dict[str, Any]):
    """Create Stripe checkout session for Pro upgrade"""
    user = await get_current_user(request)
    duration_type = payment_data.get("duration_type", "monthly")
    
    # Define prices
    prices = {
        "monthly": {"amount": 299, "name": "Pro Monthly"},  # £2.99
        "semester": {"amount": 999, "name": "Pro Semester"}  # £9.99
    }
    
    price_info = prices.get(duration_type, prices["monthly"])
    
    try:
        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'gbp',
                    'unit_amount': price_info["amount"],
                    'product_data': {
                        'name': price_info["name"],
                        'description': 'StudyMatch Pro Subscription',
                    },
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/payment-cancelled",
            client_reference_id=user["user_id"],
            metadata={
                'user_id': user["user_id"],
                'duration_type': duration_type,
            }
        )
        
        return {"checkout_url": checkout_session.url, "session_id": checkout_session.id}
    
    except Exception as e:
        logging.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Payment error: {str(e)}")


@api_router.post("/payment/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session['metadata']['user_id']
        duration_type = session['metadata']['duration_type']
        
        # Grant Pro access
        duration_days = 120 if duration_type == "semester" else 30
        await grant_pro_access(user_id, duration_days, "stripe_payment")
        
        logging.info(f"Pro access granted to {user_id} via Stripe payment")
    
    return {"status": "success"}


@api_router.get("/payment/verify-session/{session_id}")
async def verify_payment_session(request: Request, session_id: str):
    """Verify payment session and grant Pro access"""
    user = await get_current_user(request)
    
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        if session.payment_status == 'paid':
            # Already handled by webhook, just return status
            return {"status": "success", "paid": True}
        else:
            return {"status": "pending", "paid": False}
    
    except Exception as e:
        logging.error(f"Payment verification error: {str(e)}")
        raise HTTPException(status_code=400, detail="Verification failed")


# Photo Upload Endpoint
@api_router.post("/users/upload-photo")
async def upload_photo(request: Request, photo_data: Dict[str, Any]):
    """Upload user profile photo (base64)"""
    user = await get_current_user(request)
    photo_base64 = photo_data.get("photo_base64", "")
    
    if not photo_base64:
        raise HTTPException(status_code=400, detail="Photo data required")
    
    # Validate base64 (basic check)
    if not photo_base64.startswith("data:image"):
        raise HTTPException(status_code=400, detail="Invalid image format")
    
    # Update user profile
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"profile_photo": photo_base64}}
    )
    
    return {"message": "Photo uploaded successfully", "photo": photo_base64}


# Push Notification Token Storage
@api_router.post("/notifications/register-token")
async def register_push_token(request: Request, token_data: Dict[str, Any]):
    """Register device push notification token"""
    user = await get_current_user(request)
    push_token = token_data.get("push_token", "")
    
    if not push_token:
        raise HTTPException(status_code=400, detail="Push token required")
    
    # Store token in user document
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"push_token": push_token}}
    )
    
    return {"message": "Push token registered successfully"}


@api_router.post("/notifications/send")
async def send_push_notification(request: Request, notification_data: Dict[str, Any]):
    """Send push notification to users (internal use)"""
    # This would be called internally when certain events happen
    # For now, it's a placeholder for Expo push notification integration
    
    user_ids = notification_data.get("user_ids", [])
    title = notification_data.get("title", "StudyMatch")
    body = notification_data.get("body", "")
    data = notification_data.get("data", {})
    
    # Get users' push tokens
    users = await db.users.find(
        {"user_id": {"$in": user_ids}, "push_token": {"$exists": True}},
        {"_id": 0, "push_token": 1}
    ).to_list(100)
    
    tokens = [u["push_token"] for u in users if u.get("push_token")]
    
    if not tokens:
        return {"message": "No recipients found"}
    
    # In production, integrate with Expo Push Notification service
    # For now, just log
    logging.info(f"Would send push notification to {len(tokens)} devices: {title} - {body}")
    
    return {"message": f"Notification queued for {len(tokens)} devices"}
