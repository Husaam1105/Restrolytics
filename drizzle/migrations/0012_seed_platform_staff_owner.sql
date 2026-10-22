INSERT INTO public.platform_staff (user_id)
SELECT rm.user_id FROM public.restaurant_members rm
WHERE lower(rm.email) = 'musaib.syid@gmail.com' AND rm.role = 'owner'
ON CONFLICT DO NOTHING;