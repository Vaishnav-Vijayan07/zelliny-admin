import { Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { SectionsPage } from "@/components/admin/SectionsPage";
import { useDone } from "@/components/admin/SiteContentUi";

export default function HomepageEditPage() {
  const [doneNode, done] = useDone();
  const navigate = useNavigate();
  return (
    <>
      <SectionsPage
        id="home"
        done={done}
        onBack={() => navigate({ to: "/content" })}
        crumb={
          <Link to="/content" className="underline underline-offset-[3px]">
            Site content
          </Link>
        }
      />
      {doneNode}
    </>
  );
}
