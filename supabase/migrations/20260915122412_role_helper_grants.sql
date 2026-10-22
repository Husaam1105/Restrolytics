REVOKE EXECUTE ON FUNCTION public.restaurant_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_restaurant_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_restaurant(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_restaurant_owner(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.restaurant_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_restaurant_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_restaurant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_restaurant_owner(uuid) TO authenticated, service_role;