import { Button } from "@/components/ui/button";
import { Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CertificateDownloadProps {
  courseTitle: string;
  userName: string;
  completionDate: string;
}

export const CertificateDownload = ({ courseTitle, userName, completionDate }: CertificateDownloadProps) => {
  const { toast } = useToast();

  const generateCertificate = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1100;
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#FFFDF7";
    ctx.fillRect(0, 0, 1600, 1100);

    // Border
    ctx.strokeStyle = "#7C3AED";
    ctx.lineWidth = 6;
    ctx.strokeRect(40, 40, 1520, 1020);

    // Inner border
    ctx.strokeStyle = "#DDD6FE";
    ctx.lineWidth = 2;
    ctx.strokeRect(55, 55, 1490, 990);

    // Decorative corners
    const drawCorner = (x: number, y: number, flipX: number, flipY: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(flipX, flipY);
      ctx.strokeStyle = "#7C3AED";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 50);
      ctx.lineTo(0, 0);
      ctx.lineTo(50, 0);
      ctx.stroke();
      ctx.restore();
    };
    drawCorner(60, 60, 1, 1);
    drawCorner(1540, 60, -1, 1);
    drawCorner(60, 1040, 1, -1);
    drawCorner(1540, 1040, -1, -1);

    // Header accent line
    ctx.fillStyle = "#7C3AED";
    ctx.fillRect(600, 100, 400, 4);

    // "Certificate of Completion"
    ctx.fillStyle = "#7C3AED";
    ctx.font = "bold 18px 'Georgia', serif";
    ctx.textAlign = "center";
    ctx.fillText("CERTIFICATE OF COMPLETION", 800, 160);

    // Award icon placeholder
    ctx.font = "60px serif";
    ctx.fillText("🏆", 800, 240);

    // Congratulations
    ctx.fillStyle = "#1F2937";
    ctx.font = "22px 'Georgia', serif";
    ctx.fillText("This is to certify that", 800, 320);

    // User name
    ctx.fillStyle = "#7C3AED";
    ctx.font = "bold 52px 'Georgia', serif";
    ctx.fillText(userName || "Student", 800, 400);

    // Underline under name
    const nameWidth = ctx.measureText(userName || "Student").width;
    ctx.strokeStyle = "#DDD6FE";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(800 - nameWidth / 2, 415);
    ctx.lineTo(800 + nameWidth / 2, 415);
    ctx.stroke();

    // Has successfully completed
    ctx.fillStyle = "#4B5563";
    ctx.font = "22px 'Georgia', serif";
    ctx.fillText("has successfully completed the course", 800, 480);

    // Course title
    ctx.fillStyle = "#1F2937";
    ctx.font = "bold 40px 'Georgia', serif";
    ctx.fillText(`"${courseTitle}"`, 800, 550);

    // Completion message
    ctx.fillStyle = "#6B7280";
    ctx.font = "18px 'Georgia', serif";
    ctx.fillText("Demonstrating dedication, skill, and commitment to mastering the art of ghostwriting.", 800, 620);
    ctx.fillText("This achievement reflects exceptional effort and a passion for continuous learning.", 800, 650);

    // Date
    ctx.fillStyle = "#4B5563";
    ctx.font = "20px 'Georgia', serif";
    ctx.fillText(`Completed on ${completionDate}`, 800, 730);

    // Divider
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(400, 780);
    ctx.lineTo(1200, 780);
    ctx.stroke();

    // Signature area
    ctx.fillStyle = "#7C3AED";
    ctx.font = "italic 28px 'Georgia', serif";
    ctx.fillText("GhostPen Academy", 800, 840);

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "16px 'Georgia', serif";
    ctx.fillText("Authorized by GhostPen Academy", 800, 880);

    // Footer
    ctx.fillStyle = "#D1D5DB";
    ctx.font = "14px 'Georgia', serif";
    ctx.fillText("This certificate verifies the successful completion of all course modules and assessments.", 800, 960);

    // Bottom accent line
    ctx.fillStyle = "#7C3AED";
    ctx.fillRect(600, 990, 400, 4);

    // Download
    const link = document.createElement("a");
    link.download = `${courseTitle.replace(/\s+/g, "-")}-Certificate.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    toast({ title: "Certificate downloaded! 🎉" });
  };

  return (
    <Button onClick={generateCertificate} className="gap-2" variant="default">
      <Award className="h-4 w-4" />
      Download Certificate
    </Button>
  );
};
