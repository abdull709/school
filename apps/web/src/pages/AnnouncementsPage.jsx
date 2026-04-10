import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';
import { format } from 'date-fns';

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await pb.collection('announcements').getList(1, 200, {
          expand: 'posted_by',
          sort: '-created',
          $autoCancel: false,
        });
        setAnnouncements(data.items);
      } catch (error) {
        toast.error('Failed to load announcements');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const filtered = announcements.filter(
    (a) =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Announcements - Smart School Manager</title>
        <meta name="description" content="Read school-wide announcements." />
      </Helmet>

      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold mb-2">Announcements</h1>
          <p className="text-muted-foreground">Stay informed with the latest school news</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search announcements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Megaphone className="h-10 w-10 opacity-30" />
            <p>{searchTerm ? 'No results for your search.' : 'No announcements yet.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((announcement) => (
              <Card
                key={announcement.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelected(announcement)}
              >
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="font-semibold text-base">{announcement.title}</h3>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {announcement.created
                        ? format(new Date(announcement.created), 'MMM d, yyyy')
                        : '—'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{announcement.content}</p>
                  {announcement.expand?.posted_by && (
                    <p className="text-xs text-muted-foreground">
                      Posted by {announcement.expand.posted_by.name}
                    </p>
                  )}
                  <Button variant="link" className="p-0 h-auto text-sm">
                    Read more
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selected.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <Badge variant="secondary">
                  {selected.created ? format(new Date(selected.created), 'MMMM d, yyyy') : '—'}
                </Badge>
                {selected.expand?.posted_by && (
                  <span>Posted by {selected.expand.posted_by.name}</span>
                )}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.content}</p>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
};

export default AnnouncementsPage;
