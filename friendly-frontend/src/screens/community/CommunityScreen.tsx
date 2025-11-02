import { ImageWithFallback } from '@/src/components/common/ImageWithFallback';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface CommunityPost {
  id: number;
  author: {
    name: string;
    avatar: string;
    country: string;
    university: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  category: string;
  isLiked: boolean;
}

interface CommunityPageProps {
  title: string;
  onBack: () => void;
}

const MOCK_POSTS: CommunityPost[] = [
  {
    id: 1,
    author: {
      name: "David Park",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      country: "South Korea",
      university: "Seoul National University"
    },
    content: "Just aced my Algorithm midterm! The sorting algorithms practice really paid off. Happy to share my study notes with anyone who needs them.",
    timestamp: "2h ago",
    likes: 12,
    comments: 5,
    category: "Study Tips",
    isLiked: false
  },
  {
    id: 2,
    author: {
      name: "Aisha Rahman",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
      country: "Canada",
      university: "University of Toronto"
    },
    content: "Looking for study partners for Mobile Programming final project. Anyone working on React Native apps?",
    timestamp: "4h ago",
    likes: 8,
    comments: 3,
    category: "Study Groups",
    isLiked: true
  },
  {
    id: 3,
    author: {
      name: "Lucas Silva",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
      country: "Brazil",
      university: "University of São Paulo"
    },
    content: "Finished my Computer Architecture project ahead of schedule! Time management tips: break tasks into 30-min blocks and take regular breaks.",
    timestamp: "6h ago",
    likes: 24,
    comments: 8,
    category: "Success Stories",
    isLiked: false
  },
  {
    id: 4,
    author: {
      name: "Yuki Tanaka",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
      country: "Japan",
      university: "University of Tokyo"
    },
    content: "Anyone else struggling with Discrete Mathematics proofs? Found some great YouTube resources that really helped me understand the concepts better.",
    timestamp: "8h ago",
    likes: 18,
    comments: 11,
    category: "Study Tips",
    isLiked: false
  },
  {
    id: 5,
    author: {
      name: "Sophie Laurent",
      avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face",
      country: "France",
      university: "Sorbonne University"
    },
    content: "Organizing a study group for Public Speaking class. We meet every Wednesday at 7 PM. DM if interested!",
    timestamp: "1d ago",
    likes: 15,
    comments: 7,
    category: "Study Groups",
    isLiked: true
  },
  {
    id: 6,
    author: {
      name: "James Chen",
      avatar: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face",
      country: "USA",
      university: "Stanford University"
    },
    content: "Got an A+ on my Social Marketing Campaign project! The key was really understanding the target audience and creating authentic content. Happy to help anyone with their projects!",
    timestamp: "2d ago",
    likes: 31,
    comments: 14,
    category: "Success Stories",
    isLiked: false
  },
];

const CATEGORIES = [
  'All',
  'Study Tips',
  'Study Groups',
  'Success Stories',
  'Research',
  'Community Projects',
  'General'
];

const COUNTRIES = [
  'All Countries',
  'USA',
  'Canada',
  'UK',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Singapore',
  'Japan',
  'South Korea',
  'China',
  'India',
  'Australia',
  'Brazil',
  'Mexico',
  'Netherlands',
  'Sweden',
  'Switzerland'
];

const UNIVERSITIES = [
  'All Universities',
  'Seoul National University',
  'Korea University',
  'Yonsei University',
  'KAIST',
  'POSTECH',
  'Sungkyunkwan University',
  'Hanyang University',
  'Kyung Hee University',
  'Ewha Womans University',
  'Sogang University',
  'Chung-Ang University',
  'Konkuk University',
  'Hankuk University of Foreign Studies',
  'Dongguk University',
  'University of Seoul',
  'Kookmin University',
  'Catholic University of Korea',
  'Inha University',
  'Ajou University',
  'Soongsil University',
  'Myongji University',
  'Hongik University',
  'Hansung University',
  'Chungnam National University',
  'Pusan National University',
  'Chonnam National University',
  'Chonbuk National University',
  'Gyeongsang National University',
  'Kangwon National University',
  'Jeju National University',
  'Kyungpook National University',
  'UNIST',
  'DGIST',
  'GIST',
  'Sookmyung Women\'s University',
  'Seoul Women\'s University',
  'Dongduk Women\'s University',
  'Duksung Women\'s University',
  'Hanshin University',
  'Kyungsung University',
  'Keimyung University',
  'Yeungnam University',
  'Wonkwang University',
  'Mokpo National University',
  'Andong National University',
  'Chungbuk National University',
  'Daejeon University',
  'Korea National University of Arts',
  'Seoul Institute of the Arts',
  'Korea Aerospace University'
];

const CommunityPage: React.FC<CommunityPageProps> = ({
  title,
  onBack,
}) => {
  const [posts, setPosts] = useState<CommunityPost[]>(MOCK_POSTS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('All Countries');
  const [selectedUniversity, setSelectedUniversity] = useState('All Universities');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [universitySearch, setUniversitySearch] = useState("");

  const filteredPosts = posts.filter(post => {
    const categoryMatch = selectedCategory === 'All' || post.category === selectedCategory;
    const countryMatch = selectedCountry === 'All Countries' || post.author.country === selectedCountry;
    const universityMatch = selectedUniversity === 'All Universities' || post.author.university === selectedUniversity;
    return categoryMatch && countryMatch && universityMatch;
  });

  const filteredCountries = COUNTRIES.filter(country => 
    country.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const filteredUniversities = UNIVERSITIES.filter(university => 
    university.toLowerCase().includes(universitySearch.toLowerCase())
  );

  const handleLike = (postId: number) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
        : post
    ));
  };

  const handleNewPost = () => {
    if (!newPostContent.trim()) return;
    
    const newPost: CommunityPost = {
      id: posts.length + 1,
      author: {
        name: "You",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
        country: "USA",
        university: "Your University"
      },
      content: newPostContent,
      timestamp: "now",
      likes: 0,
      comments: 0,
      category: "General",
      isLiked: false
    };

    setPosts([newPost, ...posts]);
    setNewPostContent("");
    setShowNewPost(false);
  };

  const getCategoryColor = (category: string) => {
    return { bg: '#f8f8f8', color: '#000', border: '#e0e0e0' };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <TouchableOpacity 
          onPress={() => setShowNewPost(!showNewPost)}
          style={styles.newPostButton}
        >
          <Ionicons name="add" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterDropdown}
          onPress={() => {
            setShowCategoryDropdown(!showCategoryDropdown);
            setShowCountryDropdown(false);
            setShowUniversityDropdown(false);
          }}
        >
          <Ionicons name="filter-outline" size={16} color="#000" />
          <Text style={styles.filterText} numberOfLines={1}>{selectedCategory}</Text>
          <Ionicons name="chevron-down" size={14} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterDropdown}
          onPress={() => {
            setShowCountryDropdown(!showCountryDropdown);
            setShowCategoryDropdown(false);
            setShowUniversityDropdown(false);
            setCountrySearch("");
          }}
        >
          <Ionicons name="globe-outline" size={16} color="#000" />
          <Text style={styles.filterText} numberOfLines={1}>
            {selectedCountry === 'All Countries' ? 'Countries' : selectedCountry}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterDropdown}
          onPress={() => {
            setShowUniversityDropdown(!showUniversityDropdown);
            setShowCategoryDropdown(false);
            setShowCountryDropdown(false);
            setUniversitySearch("");
          }}
        >
          <Ionicons name="school-outline" size={16} color="#000" />
          <Text style={styles.filterText} numberOfLines={1}>
            {selectedUniversity === 'All Universities' ? 'Universities' : selectedUniversity}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Category Dropdown */}
      {showCategoryDropdown && (
        <View style={styles.dropdownContainer}>
          <ScrollView style={styles.dropdown} nestedScrollEnabled>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.dropdownItem,
                  selectedCategory === category && styles.dropdownItemActive
                ]}
                onPress={() => {
                  setSelectedCategory(category);
                  setShowCategoryDropdown(false);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedCategory === category && styles.dropdownItemTextActive
                ]}>
                  {category}
                </Text>
                {selectedCategory === category && (
                  <Ionicons name="checkmark" size={18} color="#000" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Country Dropdown with Search */}
      {showCountryDropdown && (
        <View style={styles.dropdownContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor="#9ca3af"
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoFocus
            />
            {countrySearch.length > 0 && (
              <TouchableOpacity onPress={() => setCountrySearch("")}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView style={styles.dropdown} nestedScrollEnabled>
            {filteredCountries.map((country) => (
              <TouchableOpacity
                key={country}
                style={[
                  styles.dropdownItem,
                  selectedCountry === country && styles.dropdownItemActive
                ]}
                onPress={() => {
                  setSelectedCountry(country);
                  setShowCountryDropdown(false);
                  setCountrySearch("");
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedCountry === country && styles.dropdownItemTextActive
                ]}>
                  {country}
                </Text>
                {selectedCountry === country && (
                  <Ionicons name="checkmark" size={18} color="#000" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* University Dropdown with Search */}
      {showUniversityDropdown && (
        <View style={styles.dropdownContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search universities..."
              placeholderTextColor="#9ca3af"
              value={universitySearch}
              onChangeText={setUniversitySearch}
              autoFocus
            />
            {universitySearch.length > 0 && (
              <TouchableOpacity onPress={() => setUniversitySearch("")}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView style={styles.dropdown} nestedScrollEnabled>
            {filteredUniversities.map((university) => (
              <TouchableOpacity
                key={university}
                style={[
                  styles.dropdownItem,
                  selectedUniversity === university && styles.dropdownItemActive
                ]}
                onPress={() => {
                  setSelectedUniversity(university);
                  setShowUniversityDropdown(false);
                  setUniversitySearch("");
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedUniversity === university && styles.dropdownItemTextActive
                ]}>
                  {university}
                </Text>
                {selectedUniversity === university && (
                  <Ionicons name="checkmark" size={18} color="#000" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* New Post Card */}
      {showNewPost && (
        <View style={styles.newPostCard}>
          <View style={styles.newPostHeader}>
            <Ionicons name="create-outline" size={20} color="#000" />
            <Text style={styles.newPostTitle}>Create Post</Text>
          </View>
          <TextInput
            placeholder="Share your thoughts, questions, or experiences..."
            placeholderTextColor="#999"
            value={newPostContent}
            onChangeText={setNewPostContent}
            multiline
            numberOfLines={4}
            style={styles.newPostInput}
          />
          <View style={styles.newPostActions}>
            <TouchableOpacity 
              onPress={() => setShowNewPost(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleNewPost}
              style={styles.postButton}
            >
              <Text style={styles.postButtonText}>Post</Text>
              <Ionicons name="send" size={16} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Posts Feed */}
      <ScrollView 
        style={styles.feed}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
      >
        {filteredPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>No posts found</Text>
            <Text style={styles.emptyText}>Try changing your filters</Text>
          </View>
        ) : (
          filteredPosts.map((post) => {
            const categoryStyle = getCategoryColor(post.category);
            
            return (
              <View key={post.id} style={styles.postCard}>
                {/* Post Header */}
                <View style={styles.postHeader}>
                  <View style={styles.avatarContainer}>
                    <ImageWithFallback
                      src={post.author.avatar}
                      alt={post.author.name}
                      style={styles.avatar}
                    />
                  </View>
                  
                  <View style={styles.postAuthorInfo}>
                    <View style={styles.authorRow}>
                      <Text style={styles.authorName} numberOfLines={1}>
                        {post.author.name}
                      </Text>
                      <View style={[styles.categoryChip, { 
                        backgroundColor: categoryStyle.bg,
                        borderColor: categoryStyle.border
                      }]}>
                        <Text style={[styles.categoryChipText, { color: categoryStyle.color }]}>
                          {post.category}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.metaRow}>
                      <Ionicons name="school-outline" size={12} color="#9ca3af" />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {post.author.university}
                      </Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.metaText}>{post.timestamp}</Text>
                    </View>
                  </View>
                </View>

                {/* Post Content */}
                <Text style={styles.postContent}>{post.content}</Text>

                {/* Post Actions */}
                <View style={styles.postActions}>
                  <TouchableOpacity 
                    onPress={() => handleLike(post.id)}
                    style={styles.actionButton}
                  >
                    <Ionicons 
                      name={post.isLiked ? "heart" : "heart-outline"} 
                      size={20} 
                      color={post.isLiked ? "#000" : "#666"} 
                    />
                    <Text style={[styles.actionText, post.isLiked && styles.actionTextActive]}>
                      {post.likes}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="chatbubble-outline" size={20} color="#666" />
                    <Text style={styles.actionText}>{post.comments}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="share-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  newPostButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  filterDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  filterText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    padding: 0,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 240,
  },
  dropdown: {
    borderRadius: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#f8f8f8',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: '#000',
  },
  newPostCard: {
    backgroundColor: 'white',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  newPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  newPostTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  newPostInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    fontSize: 15,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  newPostActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  postButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#000',
    gap: 8,
  },
  postButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  postCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  postHeader: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#f8f8f8',
  },
  avatar: {
    width: 44,
    height: 44,
  },
  postAuthorInfo: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  authorName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#999',
  },
  postContent: {
    fontSize: 15,
    color: '#000',
    lineHeight: 24,
    marginBottom: 16,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  actionTextActive: {
    color: '#000',
  },
});

export default CommunityPage;